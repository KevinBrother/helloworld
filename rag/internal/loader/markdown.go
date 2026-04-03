package loader

import (
	"fmt"
	"os"
)

// MarkdownLoader reads a Markdown file verbatim.
// The heading structure (# / ## / ###) is preserved for the heading chunker.
type MarkdownLoader struct{}

func (l *MarkdownLoader) Load(path string) (*Document, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("markdown loader: %w", err)
	}
	return &Document{
		Content:  string(data),
		FileType: "markdown",
		Metadata: map[string]string{"source": path},
	}, nil
}
