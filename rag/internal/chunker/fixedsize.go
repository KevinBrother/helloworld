package chunker

import (
	"fmt"
	"strings"

	"github.com/helloworld/rag/internal/loader"
)

// FixedSizeChunker splits document text into chunks of a fixed rune count
// with a configurable overlap (sliding window).
//
// Example with Size=100, Overlap=20:
//
//	chunk 0: runes[0:100]
//	chunk 1: runes[80:180]
//	chunk 2: runes[160:260]
//	…
//
// Overlap ensures that sentences crossing a boundary are represented
// in at least one full chunk, improving retrieval recall.
type FixedSizeChunker struct {
	// Size is the maximum number of runes per chunk. Default: 500.
	Size int
	// Overlap is the number of runes shared between consecutive chunks. Default: 50.
	Overlap int
}

// NewFixedSizeChunker returns a FixedSizeChunker with sensible defaults.
func NewFixedSizeChunker(size, overlap int) *FixedSizeChunker {
	if size <= 0 {
		size = 500
	}
	if overlap < 0 {
		overlap = 0
	}
	if overlap >= size {
		overlap = size / 5 // guard: overlap must be smaller than size
	}
	return &FixedSizeChunker{Size: size, Overlap: overlap}
}

func (c *FixedSizeChunker) Chunk(doc *loader.Document) ([]Chunk, error) {
	source := doc.Metadata["source"]
	runes := []rune(strings.TrimSpace(doc.Content))
	total := len(runes)

	if total == 0 {
		return nil, nil
	}

	step := c.Size - c.Overlap
	if step <= 0 {
		step = 1
	}

	var chunks []Chunk
	idx := 0
	for start := 0; start < total; start += step {
		end := start + c.Size
		if end > total {
			end = total
		}

		text := strings.TrimSpace(string(runes[start:end]))
		if text == "" {
			continue
		}

		chunks = append(chunks, Chunk{
			ID:   chunkID(source, idx),
			Text: text,
			Metadata: map[string]string{
				"source":      source,
				"filetype":    doc.FileType,
				"strategy":    "fixedsize",
				"chunk_index": fmt.Sprintf("%d", idx),
				"chunk_start": fmt.Sprintf("%d", start),
				"chunk_end":   fmt.Sprintf("%d", end),
				"chunk_size":  fmt.Sprintf("%d", c.Size),
				"overlap":     fmt.Sprintf("%d", c.Overlap),
			},
		})
		idx++

		if end == total {
			break
		}
	}

	return chunks, nil
}
