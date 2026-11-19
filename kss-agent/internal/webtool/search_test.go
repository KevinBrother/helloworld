package webtool

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"testing"
	"unicode/utf8"

	"github.com/cloudwego/eino/components/tool"
)

type fakeSearcher struct {
	result SearchResult
	err    error
	calls  int
}

func (f *fakeSearcher) Search(context.Context, string) (SearchResult, error) {
	f.calls++
	return f.result, f.err
}

func newSearchTool(t *testing.T, searcher Searcher) tool.BaseTool {
	t.Helper()
	base, err := NewSearchTool(searcher)
	if err != nil {
		t.Fatal(err)
	}
	return base
}

func invokeSearch(t *testing.T, base tool.BaseTool, query string) (string, error) {
	t.Helper()
	invokable, ok := base.(tool.InvokableTool)
	if !ok {
		t.Fatal("tool is not invokable")
	}
	args, err := json.Marshal(map[string]any{"query": query})
	if err != nil {
		t.Fatal(err)
	}
	return invokable.InvokableRun(context.Background(), string(args))
}

func TestNewSearchToolRejectsNilSearcher(t *testing.T) {
	if _, err := NewSearchTool(nil); err == nil {
		t.Fatal("expected nil searcher to be rejected")
	}
}

func TestSearchToolInfo(t *testing.T) {
	base := newSearchTool(t, &fakeSearcher{})
	info, err := base.Info(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if info.Name != "web_search" {
		t.Fatalf("name = %q, want web_search", info.Name)
	}
	if SearchToolName != "web_search" {
		t.Fatalf("SearchToolName = %q, want web_search", SearchToolName)
	}
	if !strings.Contains(strings.ToLower(info.Desc), "untrusted") {
		t.Fatalf("description should warn about untrusted content: %q", info.Desc)
	}
	encoded, err := json.Marshal(info)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(encoded), `"query"`) {
		t.Fatalf("schema should expose query: %s", encoded)
	}
}

func TestSearchToolRejectsBlankQuery(t *testing.T) {
	searcher := &fakeSearcher{}
	tool := newSearchTool(t, searcher)
	_, err := invokeSearch(t, tool, "   ")
	if err == nil {
		t.Fatal("expected blank query to be rejected")
	}
	if !strings.Contains(err.Error(), "query") {
		t.Fatalf("error = %v", err)
	}
	if searcher.calls != 0 {
		t.Fatalf("searcher calls = %d, want 0", searcher.calls)
	}
}

func TestSearchToolFormatsAnswerAndSources(t *testing.T) {
	searcher := &fakeSearcher{result: SearchResult{
		Answer: "Go 1.27 was released.",
		Sources: []Source{
			{Title: "Go Blog", URL: "https://go.dev/blog", Snippet: "release notes"},
			{Title: "Release History", URL: "https://go.dev/doc/devel/release"},
		},
	}}
	out, err := invokeSearch(t, newSearchTool(t, searcher), "latest go release")
	if err != nil {
		t.Fatal(err)
	}
	for _, want := range []string{
		"Go 1.27 was released.",
		"UNTRUSTED EXTERNAL CONTENT",
		"END UNTRUSTED CONTENT",
		"https://go.dev/blog",
		"Go Blog",
		"release notes",
		"https://go.dev/doc/devel/release",
		"Sources:",
		"Cite the relevant URLs above as markdown links.",
	} {
		if !strings.Contains(out, want) {
			t.Errorf("output missing %q:\n%s", want, out)
		}
	}
	if searcher.calls != 1 {
		t.Fatalf("searcher calls = %d, want 1", searcher.calls)
	}
}

func TestSearchToolWithoutSources(t *testing.T) {
	searcher := &fakeSearcher{result: SearchResult{Answer: "summary only"}}
	out, err := invokeSearch(t, newSearchTool(t, searcher), "anything")
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(out, "No sources were returned") {
		t.Fatalf("output should state that no sources were returned:\n%s", out)
	}
	if strings.Contains(out, "Sources:") {
		t.Fatalf("output should not contain a Sources section:\n%s", out)
	}
}

func TestSearchToolTruncatesAnswerAndSources(t *testing.T) {
	longAnswer := strings.Repeat("a", 5000)
	sources := make([]Source, 12)
	for i := range sources {
		sources[i] = Source{Title: "Example", URL: "https://example.com/" + strings.Repeat("x", i+1)}
	}
	searcher := &fakeSearcher{result: SearchResult{Answer: longAnswer, Sources: sources}}
	out, err := invokeSearch(t, newSearchTool(t, searcher), "big")
	if err != nil {
		t.Fatal(err)
	}
	if len(out) > maxSearchAnswerChars+1000 {
		t.Fatalf("output too long: %d bytes", len(out))
	}
	if !strings.Contains(out, "truncated") {
		t.Fatalf("expected a truncation marker:\n%s", out)
	}
	if got := strings.Count(out, "https://example.com/"); got > maxSearchSources {
		t.Fatalf("too many sources shown: %d", got)
	}
}

func TestSearchToolPropagatesSearcherError(t *testing.T) {
	searcher := &fakeSearcher{err: errors.New("boom")}
	_, err := invokeSearch(t, newSearchTool(t, searcher), "query")
	if err == nil {
		t.Fatal("expected searcher error")
	}
	if !strings.Contains(err.Error(), "boom") {
		t.Fatalf("error = %v", err)
	}
}

func TestSearchToolTruncationKeepsValidUTF8(t *testing.T) {
	searcher := &fakeSearcher{result: SearchResult{Answer: strings.Repeat("搜索", 3000)}}
	out, err := invokeSearch(t, newSearchTool(t, searcher), "中文")
	if err != nil {
		t.Fatal(err)
	}
	if !utf8.ValidString(out) {
		t.Fatal("truncated output must stay valid UTF-8")
	}
	if !strings.Contains(out, "truncated") {
		t.Fatalf("expected a truncation marker:\n%s", out[:200])
	}
}
