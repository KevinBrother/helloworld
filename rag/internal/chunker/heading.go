package chunker

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/helloworld/rag/internal/loader"
)

// headingRe matches an ATX Markdown heading at the start of a line.
// It captures the hashes (group 1) and the heading text (group 2).
var headingRe = regexp.MustCompile(`(?m)^(#{1,6}) (.+)$`)

// HeadingChunker splits a document at every Markdown heading boundary.
// Each chunk contains one heading and all content that follows it up to
// the next heading of any level.
//
// Documents without any headings are returned as a single chunk.
type HeadingChunker struct{}

func (c *HeadingChunker) Chunk(doc *loader.Document) ([]Chunk, error) {
	src := doc.Content
	source := doc.Metadata["source"]

	// Find all heading positions in the document.
	matches := headingRe.FindAllStringIndex(src, -1)

	if len(matches) == 0 {
		// No headings found — return the whole document as one chunk.
		return []Chunk{{
			ID:   chunkID(source, 0),
			Text: strings.TrimSpace(src),
			Metadata: map[string]string{
				"source":        source,
				"filetype":      doc.FileType,
				"strategy":      "heading",
				"chunk_index":   "0",
				"heading":       "",
				"heading_level": "0",
			},
		}}, nil
	}

	chunks := make([]Chunk, 0, len(matches))

	// pendingHeading accumulates bare heading lines (sections with no body)
	// so they can be prepended as context to the next chunk that has body text.
	// For example "## 索引阶段\n" followed immediately by "### 文档加载..." will
	// produce a single chunk with both headings and the body of 文档加载.
	var pendingHeading string

	for i, loc := range matches {
		// The chunk starts at this heading and ends just before the next one.
		start := loc[0]
		end := len(src)
		if i+1 < len(matches) {
			end = matches[i+1][0]
		}

		text := strings.TrimSpace(src[start:end])
		if text == "" {
			continue
		}

		// Extract heading metadata from the first line of the chunk.
		heading, level := parseHeading(src[loc[0]:loc[1]])

		// If this chunk contains only the heading line with no body content,
		// accumulate it so it is prepended to the next real chunk.
		lines := strings.SplitN(text, "\n", 2)
		if len(lines) < 2 || strings.TrimSpace(lines[1]) == "" {
			pendingHeading += text + "\n\n"
			continue
		}

		// Prepend any accumulated bare headings.
		if pendingHeading != "" {
			text = pendingHeading + text
			pendingHeading = ""
		}

		chunks = append(chunks, Chunk{
			ID:   chunkID(source, i),
			Text: text,
			Metadata: map[string]string{
				"source":        source,
				"filetype":      doc.FileType,
				"strategy":      "heading",
				"chunk_index":   fmt.Sprintf("%d", i),
				"heading":       heading,
				"heading_level": fmt.Sprintf("%d", level),
			},
		})
	}

	return chunks, nil
}

// parseHeading extracts the heading text and level from a line like "## My Title".
func parseHeading(line string) (text string, level int) {
	sub := headingRe.FindStringSubmatch(line)
	if sub == nil {
		return "", 0
	}
	return strings.TrimSpace(sub[2]), len(sub[1])
}

// chunkID creates a deterministic ID from the source file path and chunk index.
func chunkID(source string, index int) string {
	return fmt.Sprintf("%s:%d", source, index)
}
