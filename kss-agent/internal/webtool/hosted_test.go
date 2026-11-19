package webtool

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

const hostedSuccessBody = `{
  "status": "completed",
  "output": [
    {"type": "web_search_call", "status": "completed", "action": {"type": "search", "queries": ["go release"]}},
    {"type": "message", "role": "assistant", "content": [
      {"type": "output_text", "text": "Go 1.27 was released.", "annotations": [
        {"type": "url_citation", "url": "https://go.dev/blog", "title": "Go Blog", "start_index": 0, "end_index": 5},
        {"type": "url_citation", "url": "https://go.dev/blog", "title": "Go Blog", "start_index": 6, "end_index": 9}
      ]}
    ]}
  ]
}`

func newHostedSearcher(t *testing.T, serverURL, apiKey string) *HostedSearcher {
	t.Helper()
	searcher, err := NewHostedSearcher(HostedOptions{
		BaseURL: serverURL + "/v1",
		APIKey:  apiKey,
		Model:   "gpt-test",
	})
	if err != nil {
		t.Fatal(err)
	}
	return searcher
}

func TestHostedSearcherSendsResponsesRequest(t *testing.T) {
	var received struct {
		Model string `json:"model"`
		Input string `json:"input"`
		Tools []struct {
			Type string `json:"type"`
		} `json:"tools"`
		MaxOutputTokens int   `json:"max_output_tokens"`
		Store           *bool `json:"store"`
	}
	var gotAuth, gotContentType, gotPath, gotMethod string

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotAuth = r.Header.Get("Authorization")
		gotContentType = r.Header.Get("Content-Type")
		gotPath = r.URL.Path
		gotMethod = r.Method
		raw, _ := io.ReadAll(r.Body)
		if err := json.Unmarshal(raw, &received); err != nil {
			t.Errorf("decode request: %v", err)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(hostedSuccessBody))
	}))
	defer server.Close()

	result, err := newHostedSearcher(t, server.URL, "test-key").Search(context.Background(), "go release")
	if err != nil {
		t.Fatal(err)
	}

	if gotMethod != http.MethodPost || gotPath != "/v1/responses" {
		t.Fatalf("request = %s %s, want POST /v1/responses", gotMethod, gotPath)
	}
	if gotAuth != "Bearer test-key" {
		t.Fatalf("Authorization = %q", gotAuth)
	}
	if !strings.HasPrefix(gotContentType, "application/json") {
		t.Fatalf("Content-Type = %q", gotContentType)
	}
	if received.Model != "gpt-test" {
		t.Fatalf("model = %q", received.Model)
	}
	if !strings.Contains(received.Input, "go release") {
		t.Fatalf("input = %q, want it to contain the query", received.Input)
	}
	if len(received.Tools) != 1 || received.Tools[0].Type != "web_search" {
		t.Fatalf("tools = %+v, want one web_search tool", received.Tools)
	}
	if received.Store == nil || *received.Store {
		t.Fatalf("store = %v, want explicit false", received.Store)
	}
	if received.MaxOutputTokens <= 0 {
		t.Fatalf("max_output_tokens = %d", received.MaxOutputTokens)
	}

	if result.Answer != "Go 1.27 was released." {
		t.Fatalf("answer = %q", result.Answer)
	}
	if len(result.Sources) != 1 {
		t.Fatalf("sources = %+v, want one deduplicated source", result.Sources)
	}
	if result.Sources[0].URL != "https://go.dev/blog" || result.Sources[0].Title != "Go Blog" {
		t.Fatalf("source = %+v", result.Sources[0])
	}
}

func TestHostedSearcherEmptyCitations(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`{"status":"completed","output":[{"type":"message","content":[{"type":"output_text","text":"only a summary"}]}]}`))
	}))
	defer server.Close()

	result, err := newHostedSearcher(t, server.URL, "test-key").Search(context.Background(), "q")
	if err != nil {
		t.Fatal(err)
	}
	if result.Answer != "only a summary" {
		t.Fatalf("answer = %q", result.Answer)
	}
	if len(result.Sources) != 0 {
		t.Fatalf("sources = %+v, want none", result.Sources)
	}
}

func TestHostedSearcherHTTPError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(`{"error":{"message":"bad request"}}`))
	}))
	defer server.Close()

	_, err := newHostedSearcher(t, server.URL, "test-key").Search(context.Background(), "q")
	if err == nil {
		t.Fatal("expected HTTP 400 to be an error")
	}
	for _, want := range []string{"400", "bad request"} {
		if !strings.Contains(err.Error(), want) {
			t.Fatalf("error = %v, want %q", err, want)
		}
	}
}

func TestHostedSearcherNoOutputText(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`{"status":"completed","output":[]}`))
	}))
	defer server.Close()

	_, err := newHostedSearcher(t, server.URL, "test-key").Search(context.Background(), "q")
	if err == nil || !strings.Contains(err.Error(), "output_text") {
		t.Fatalf("error = %v, want mention of output_text", err)
	}
}

func TestHostedSearcherMalformedJSON(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`not json`))
	}))
	defer server.Close()

	if _, err := newHostedSearcher(t, server.URL, "test-key").Search(context.Background(), "q"); err == nil {
		t.Fatal("expected malformed JSON to be an error")
	}
}

func TestHostedSearcherErrorPayload(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`{"status":"failed","error":{"message":"quota exceeded"}}`))
	}))
	defer server.Close()

	_, err := newHostedSearcher(t, server.URL, "test-key").Search(context.Background(), "q")
	if err == nil || !strings.Contains(err.Error(), "quota exceeded") {
		t.Fatalf("error = %v, want quota message", err)
	}
}

func TestHostedSearcherTimeout(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(200 * time.Millisecond)
		_, _ = w.Write([]byte(hostedSuccessBody))
	}))
	defer server.Close()

	searcher, err := NewHostedSearcher(HostedOptions{
		BaseURL: server.URL + "/v1",
		APIKey:  "test-key",
		Model:   "gpt-test",
		Timeout: 20 * time.Millisecond,
	})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := searcher.Search(context.Background(), "q"); err == nil {
		t.Fatal("expected timeout")
	}
}

func TestHostedSearcherRejectsOversizedResponse(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = io.CopyN(w, strings.NewReader(strings.Repeat("z", 1<<20+1)), 1<<20+1)
	}))
	defer server.Close()

	if _, err := newHostedSearcher(t, server.URL, "test-key").Search(context.Background(), "q"); err == nil {
		t.Fatal("expected oversized response to be rejected")
	}
}

func TestHostedSearcherConfigValidation(t *testing.T) {
	cases := map[string]HostedOptions{
		"empty base url": {APIKey: "k", Model: "m"},
		"bad scheme":     {BaseURL: "ftp://example.com", APIKey: "k", Model: "m"},
		"empty api key":  {BaseURL: "https://example.com", Model: "m"},
		"empty model":    {BaseURL: "https://example.com", APIKey: "k"},
	}
	for name, opts := range cases {
		t.Run(name, func(t *testing.T) {
			if _, err := NewHostedSearcher(opts); err == nil {
				t.Fatalf("expected error for %s", name)
			}
		})
	}
}

func TestHostedSearcherRedactsKeyFromError(t *testing.T) {
	const key = "test-key"
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
		fmt.Fprintf(w, `{"error":{"message":"echoed %s"}}`, key)
	}))
	defer server.Close()

	_, err := newHostedSearcher(t, server.URL, key).Search(context.Background(), "q")
	if err == nil {
		t.Fatal("expected error")
	}
	if strings.Contains(err.Error(), key) {
		t.Fatalf("error leaks the API key: %v", err)
	}
}

func TestHostedSearcherServerError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		_, _ = w.Write([]byte("upstream unavailable"))
	}))
	defer server.Close()

	_, err := newHostedSearcher(t, server.URL, "test-key").Search(context.Background(), "query")
	if err == nil || !strings.Contains(err.Error(), "500") || !strings.Contains(err.Error(), "upstream unavailable") {
		t.Fatalf("error = %v, want a 500 with the body snippet", err)
	}
}
