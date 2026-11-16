package mem

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/cloudwego/eino/schema"
)

func openStore(t *testing.T, dir string) *Store {
	t.Helper()
	s, err := NewStore(dir)
	if err != nil {
		t.Fatal(err)
	}
	return s
}
func sessionFor(t *testing.T, s *Store, id string) *Session {
	t.Helper()
	session, err := s.GetOrCreate(id)
	if err != nil {
		t.Fatal(err)
	}
	return session
}
func appendMessage(t *testing.T, s *Session, m *schema.Message) {
	t.Helper()
	if err := s.Append(m); err != nil {
		t.Fatal(err)
	}
}

func TestSessionPersistsAndIsolatesHistory(t *testing.T) {
	dir := t.TempDir()
	store := openStore(t, dir)
	a := sessionFor(t, store, "study")
	appendMessage(t, a, schema.UserMessage("我叫小曹\n我在学 Eino"))
	appendMessage(t, a, schema.AssistantMessage(strings.Repeat("你好", 40000), nil))
	b := sessionFor(t, store, "other")
	appendMessage(t, b, schema.UserMessage("不同会话"))
	// A fresh Store forces a disk read, not a cached memory lookup.
	restored := sessionFor(t, openStore(t, dir), "study")
	got := restored.GetMessages()
	if len(got) != 2 || got[0].Content != "我叫小曹\n我在学 Eino" || got[1].Content != strings.Repeat("你好", 40000) {
		t.Fatalf("restored history was lost or mixed: %d messages", len(got))
	}
	if restored.ID != "study" || !restored.CreatedAt.Equal(a.CreatedAt) {
		t.Fatal("metadata changed on restore")
	}
	if len(b.GetMessages()) != 1 {
		t.Fatal("sessions mixed")
	}
	raw, err := os.ReadFile(filepath.Join(dir, "study.jsonl"))
	if err != nil {
		t.Fatal(err)
	}
	if strings.Count(string(raw), "\n") != 3 {
		t.Fatal("expected metadata plus two JSONL records; embedded newline must be escaped")
	}
}

func TestSessionTitlesAndListDelete(t *testing.T) {
	dir := t.TempDir()
	store := openStore(t, dir)
	a := sessionFor(t, store, "")
	b := sessionFor(t, store, "")
	if a.ID == "" || a.ID == b.ID {
		t.Fatal("new sessions need distinct IDs")
	}
	if a.Title() != "New Session" {
		t.Fatal(a.Title())
	}
	appendMessage(t, a, schema.UserMessage(strings.Repeat("中", 61)))
	if a.Title() != strings.Repeat("中", 60)+"..." {
		t.Fatal("title must truncate by rune")
	}
	entries, err := openStore(t, dir).List()
	if err != nil || len(entries) != 2 {
		t.Fatalf("list = %v, %v", entries, err)
	}
	if err := store.Delete(a.ID); err != nil {
		t.Fatal(err)
	}
	if err := store.Delete(a.ID); err != nil {
		t.Fatal(err)
	}
	sessionFor(t, store, a.ID)
	if err := a.Append(schema.UserMessage("stale handle")); err == nil {
		t.Fatal("deleted session handle wrote into recreated file")
	}
}

func TestRejectInvalidSessionIDs(t *testing.T) {
	store := openStore(t, t.TempDir())
	for _, id := range []string{"../escape", "/tmp/escape", "a/b", `a\b`, ".", "with space", strings.Repeat("a", 129)} {
		if _, err := store.GetOrCreate(id); err == nil {
			t.Errorf("accepted ID %q", id)
		}
		if err := store.Delete(id); err == nil {
			t.Errorf("deleted invalid ID %q", id)
		}
	}
}

func TestRejectCorruptSession(t *testing.T) {
	for _, kind := range []string{"header", "wrong-id", "wrong-kind", "bad-message", "null-message", "unknown-role", "truncated-tail"} {
		t.Run(kind, func(t *testing.T) {
			dir := t.TempDir()
			s := sessionFor(t, openStore(t, dir), "test")
			appendMessage(t, s, schema.UserMessage("hello"))
			path := filepath.Join(dir, "test.jsonl")
			raw, err := os.ReadFile(path)
			if err != nil {
				t.Fatal(err)
			}
			data := string(raw)
			switch kind {
			case "header":
				data = "not-json\n"
			case "wrong-id":
				data = strings.Replace(data, `"id":"test"`, `"id":"other"`, 1)
			case "wrong-kind":
				data = strings.Replace(data, `"message_kind":"message"`, `"message_kind":"agentic"`, 1)
			case "bad-message":
				data += "broken\n"
			case "null-message":
				data += "null\n"
			case "unknown-role":
				data += "{\"role\":\"unknown\",\"content\":\"x\"}\n"
			case "truncated-tail":
				data = strings.TrimSuffix(data, "\n")
			}
			if err := os.WriteFile(path, []byte(data), 0600); err != nil {
				t.Fatal(err)
			}
			fresh := openStore(t, dir)
			if _, err := fresh.GetOrCreate("test"); err == nil {
				t.Fatal("accepted corrupt session")
			}
			if _, err := fresh.List(); err == nil {
				t.Fatal("list silently hid corrupt session")
			}
			after, _ := os.ReadFile(path)
			if string(after) != data {
				t.Fatal("loading changed damaged file")
			}
		})
	}
}

func TestAppendFailureDoesNotChangeHistory(t *testing.T) {
	dir := t.TempDir()
	s := sessionFor(t, openStore(t, dir), "test")
	appendMessage(t, s, schema.UserMessage("saved"))
	if err := s.Append(nil); err == nil {
		t.Fatal("accepted nil message")
	}
	unsupported := schema.UserMessage("cannot serialize")
	unsupported.Extra = map[string]any{"bad": make(chan int)}
	if err := s.Append(unsupported); err == nil {
		t.Fatal("expected encoding error")
	}
	path := filepath.Join(dir, "test.jsonl")
	if err := os.Remove(path); err != nil {
		t.Fatal(err)
	}
	if err := os.Mkdir(path, 0700); err != nil {
		t.Fatal(err)
	}
	if err := s.Append(schema.UserMessage("unsaved")); err == nil {
		t.Fatal("expected filesystem error")
	}
	if got := s.GetMessages(); len(got) != 1 || got[0].Content != "saved" {
		t.Fatal("failed append changed memory")
	}
}
