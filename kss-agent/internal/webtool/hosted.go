package webtool

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const (
	// defaultHostedTimeout bounds one hosted search request.
	defaultHostedTimeout = 60 * time.Second
	// maxHostedResponseBytes bounds how much of the provider response is read.
	maxHostedResponseBytes = 1 << 20 // 1 MiB
	// hostedMaxOutputTokens asks the provider for a short summary instead of a page.
	hostedMaxOutputTokens = 600
)

// HostedOptions configures a Searcher that delegates to a model provider's
// server-side web_search tool (OpenAI-compatible Responses API).
type HostedOptions struct {
	// BaseURL is the API root, e.g. https://api.example.com/v1.
	BaseURL string
	// APIKey authenticates the request.
	APIKey string
	// Model is the model that runs the hosted search.
	Model string
	// Timeout bounds one search request. Defaults to defaultHostedTimeout.
	Timeout time.Duration
	// HTTPClient overrides the default client (useful for tests). When set, its
	// own timeout and transport apply instead of Timeout.
	HTTPClient *http.Client
}

// HostedSearcher is a Searcher backed by the provider's hosted web search.
type HostedSearcher struct {
	endpoint string
	apiKey   string
	model    string
	client   *http.Client
}

type hostedTool struct {
	Type string `json:"type"`
}

type hostedRequest struct {
	Model           string       `json:"model"`
	Input           string       `json:"input"`
	Tools           []hostedTool `json:"tools"`
	MaxOutputTokens int          `json:"max_output_tokens"`
	// Store is false so the provider does not keep the search prompt or result.
	Store bool `json:"store"`
}

type hostedResponse struct {
	Status string `json:"status"`
	Error  *struct {
		Message string `json:"message"`
	} `json:"error"`
	Output []struct {
		Type    string `json:"type"`
		Content []struct {
			Type        string `json:"type"`
			Text        string `json:"text"`
			Annotations []struct {
				Type  string `json:"type"`
				URL   string `json:"url"`
				Title string `json:"title"`
			} `json:"annotations"`
		} `json:"content"`
	} `json:"output"`
}

// NewHostedSearcher builds a Searcher that asks the provider's model to run a
// hosted web search. It reuses the same endpoint, key and model as chat.
func NewHostedSearcher(opts HostedOptions) (*HostedSearcher, error) {
	base := strings.TrimSpace(opts.BaseURL)
	if base == "" {
		return nil, fmt.Errorf("web_search: base URL is empty")
	}
	parsed, err := url.Parse(base)
	if err != nil {
		return nil, fmt.Errorf("web_search: parse base URL: %w", err)
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return nil, fmt.Errorf("web_search: unsupported base URL scheme %q", parsed.Scheme)
	}
	if parsed.Host == "" {
		return nil, fmt.Errorf("web_search: base URL has no host")
	}
	apiKey := strings.TrimSpace(opts.APIKey)
	if apiKey == "" {
		return nil, fmt.Errorf("web_search: API key is empty")
	}
	model := strings.TrimSpace(opts.Model)
	if model == "" {
		return nil, fmt.Errorf("web_search: model is empty")
	}
	timeout := opts.Timeout
	if timeout <= 0 {
		timeout = defaultHostedTimeout
	}
	client := opts.HTTPClient
	if client == nil {
		client = &http.Client{Timeout: timeout}
	}

	return &HostedSearcher{
		endpoint: strings.TrimRight(base, "/") + "/responses",
		apiKey:   apiKey,
		model:    model,
		client:   client,
	}, nil
}

// Search asks the provider to search for query and returns its summary with
// cited sources. The provider runs the search server side; no HTML is fetched.
func (h *HostedSearcher) Search(ctx context.Context, query string) (SearchResult, error) {
	query = strings.TrimSpace(query)
	if query == "" {
		return SearchResult{}, fmt.Errorf("web_search: query must not be empty")
	}

	payload := hostedRequest{
		Model:           h.model,
		Input:           "Search the web for: " + query + ". Answer concisely and keep source URLs.",
		Tools:           []hostedTool{{Type: "web_search"}},
		MaxOutputTokens: hostedMaxOutputTokens,
		Store:           false,
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return SearchResult{}, fmt.Errorf("web_search: encode request: %w", err)
	}
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, h.endpoint, bytes.NewReader(body))
	if err != nil {
		return SearchResult{}, fmt.Errorf("web_search: build request: %w", err)
	}
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Authorization", "Bearer "+h.apiKey)
	request.Header.Set("User-Agent", "kss-agent-learning/1.0 (+web_search tool)")

	response, err := h.client.Do(request)
	if err != nil {
		return SearchResult{}, fmt.Errorf("web_search: %w", err)
	}
	defer func() { _ = response.Body.Close() }()

	raw, err := io.ReadAll(io.LimitReader(response.Body, maxHostedResponseBytes+1))
	if err != nil {
		return SearchResult{}, fmt.Errorf("web_search: read response: %w", err)
	}
	if int64(len(raw)) > maxHostedResponseBytes {
		return SearchResult{}, fmt.Errorf("web_search: response exceeds %d bytes", maxHostedResponseBytes)
	}

	if response.StatusCode < 200 || response.StatusCode >= 300 {
		body := strings.ToValidUTF8(snippet(string(raw)), "?")
		return SearchResult{}, fmt.Errorf("web_search: endpoint returned %s: %s", response.Status, h.redact(body))
	}

	var decoded hostedResponse
	if err := json.Unmarshal(raw, &decoded); err != nil {
		return SearchResult{}, fmt.Errorf("web_search: decode response: %w", err)
	}
	if decoded.Error != nil && strings.TrimSpace(decoded.Error.Message) != "" {
		return SearchResult{}, fmt.Errorf("web_search: provider error: %s", h.redact(strings.TrimSpace(decoded.Error.Message)))
	}
	if decoded.Status == "failed" {
		return SearchResult{}, fmt.Errorf("web_search: provider reported status %q", decoded.Status)
	}

	var answerParts []string
	var sources []Source
	seen := make(map[string]bool)
	for _, item := range decoded.Output {
		if item.Type != "message" {
			continue
		}
		for _, content := range item.Content {
			if content.Type != "output_text" {
				continue
			}
			if text := strings.TrimSpace(content.Text); text != "" {
				answerParts = append(answerParts, text)
			}
			for _, annotation := range content.Annotations {
				if annotation.Type != "url_citation" {
					continue
				}
				link := strings.TrimSpace(annotation.URL)
				if link == "" || seen[link] {
					continue
				}
				seen[link] = true
				sources = append(sources, Source{
					Title: strings.TrimSpace(annotation.Title),
					URL:   link,
				})
			}
		}
	}

	answer := strings.Join(answerParts, "\n")
	if answer == "" {
		return SearchResult{}, fmt.Errorf("web_search: response contains no output_text")
	}
	return SearchResult{Answer: answer, Sources: sources}, nil
}

func (h *HostedSearcher) redact(text string) string {
	if h.apiKey == "" {
		return text
	}
	return strings.ReplaceAll(text, h.apiKey, "[REDACTED]")
}
