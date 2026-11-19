package webtool

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/cloudwego/eino/components/tool"
)

func invoke(t *testing.T, base tool.BaseTool, rawURL string) (string, error) {
	t.Helper()
	invokable, ok := base.(tool.InvokableTool)
	if !ok {
		t.Fatal("tool is not invokable")
	}
	args, err := json.Marshal(map[string]any{"url": rawURL})
	if err != nil {
		t.Fatal(err)
	}
	return invokable.InvokableRun(context.Background(), string(args))
}

func newTool(t *testing.T, opts Options) tool.BaseTool {
	t.Helper()
	base, err := NewFetchTool(opts)
	if err != nil {
		t.Fatal(err)
	}
	return base
}

func TestFetchToolInfo(t *testing.T) {
	base := newTool(t, Options{})
	info, err := base.Info(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if info.Name != ToolName {
		t.Fatalf("name = %q", info.Name)
	}
	if info.Name != "web_fetch" {
		t.Fatalf("tool name = %q, want web_fetch", info.Name)
	}
	if !strings.Contains(strings.ToLower(info.Desc), "untrusted") {
		t.Fatalf("description should warn about untrusted content: %q", info.Desc)
	}
	encoded, err := json.Marshal(info)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(encoded), `"url"`) {
		t.Fatalf("schema should expose url: %s", encoded)
	}
}

func TestFetchToolFetchesText(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			t.Errorf("method = %s", r.Method)
		}
		w.Header().Set("Content-Type", "text/plain; charset=utf-8")
		_, _ = w.Write([]byte("hello from the network"))
	}))
	defer server.Close()

	out, err := invoke(t, newTool(t, Options{AllowPrivateNetwork: true}), server.URL)
	if err != nil {
		t.Fatal(err)
	}
	for _, want := range []string{"200 OK", "hello from the network", "UNTRUSTED EXTERNAL CONTENT", "END UNTRUSTED CONTENT"} {
		if !strings.Contains(out, want) {
			t.Errorf("output missing %q:\n%s", want, out)
		}
	}
}

func TestFetchToolBlocksPrivateAddressesByDefault(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte("should never be reached"))
	}))
	defer server.Close()

	_, err := invoke(t, newTool(t, Options{}), server.URL)
	if err == nil {
		t.Fatal("expected loopback address to be blocked")
	}
	if !strings.Contains(err.Error(), "blocked") {
		t.Fatalf("error = %v", err)
	}
}

func TestFetchToolRejectsUnsupportedScheme(t *testing.T) {
	_, err := invoke(t, newTool(t, Options{}), "file:///etc/passwd")
	if err == nil {
		t.Fatal("expected file:// to be rejected")
	}
	if !strings.Contains(err.Error(), "scheme") {
		t.Fatalf("error = %v", err)
	}
}

func TestFetchToolRejectsEmptyHost(t *testing.T) {
	_, err := invoke(t, newTool(t, Options{}), "http:///only-a-path")
	if err == nil {
		t.Fatal("expected empty host to be rejected")
	}
}

func TestFetchToolTruncatesLargeBody(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(strings.Repeat("z", 100)))
	}))
	defer server.Close()

	out, err := invoke(t, newTool(t, Options{AllowPrivateNetwork: true, MaxBytes: 16}), server.URL)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(out, "Truncated") {
		t.Fatalf("expected truncation notice:\n%s", out)
	}
	if got := strings.Count(out, "z"); got > 16 {
		t.Fatalf("body not truncated: %d bytes", got)
	}
}

func TestFetchToolReportsHTTPError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
		_, _ = w.Write([]byte("no such page"))
	}))
	defer server.Close()

	_, err := invoke(t, newTool(t, Options{AllowPrivateNetwork: true}), server.URL)
	if err == nil {
		t.Fatal("expected 404 to be an error")
	}
	if !strings.Contains(err.Error(), "404") || !strings.Contains(err.Error(), "no such page") {
		t.Fatalf("error = %v", err)
	}
}

func TestFetchToolRejectsNonTextContent(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "image/png")
		_, _ = w.Write([]byte{0x89, 'P', 'N', 'G'})
	}))
	defer server.Close()

	_, err := invoke(t, newTool(t, Options{AllowPrivateNetwork: true}), server.URL)
	if err == nil {
		t.Fatal("expected binary content to be rejected")
	}
	if !strings.Contains(err.Error(), "image/png") {
		t.Fatalf("error = %v", err)
	}
}

func TestFetchToolRejectsUnsupportedRedirect(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "ftp://example.com/file", http.StatusFound)
	}))
	defer server.Close()

	_, err := invoke(t, newTool(t, Options{AllowPrivateNetwork: true}), server.URL)
	if err == nil {
		t.Fatal("expected ftp redirect to be rejected")
	}
	if !strings.Contains(err.Error(), "scheme") {
		t.Fatalf("error = %v", err)
	}
}

func TestFetchToolTimesOut(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(300 * time.Millisecond)
		_, _ = w.Write([]byte("late"))
	}))
	defer server.Close()

	_, err := invoke(t, newTool(t, Options{AllowPrivateNetwork: true, Timeout: 30 * time.Millisecond}), server.URL)
	if err == nil {
		t.Fatal("expected timeout")
	}
}
