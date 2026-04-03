package chunker

import (
	"github.com/helloworld/rag/internal/loader"
)

// Chunk is a single piece of text ready for embedding.
// Metadata carries provenance information useful at retrieval time.
type Chunk struct {
	ID       string
	Text     string
	Metadata map[string]string // "source", "filetype", "strategy", "chunk_index",
	//                            "heading" (HeadingChunker only), "heading_level"
}

// Chunker splits a Document into Chunks.
type Chunker interface {
	Chunk(doc *loader.Document) ([]Chunk, error)
}

// DefaultStrategy returns a sensible default chunking strategy for the given
// file type. Callers pass doc.FileType.
//
//   - "markdown" / "html" -> "heading"  (structured text with meaningful headings)
//   - "pdf" / "image" / anything else -> "fixedsize" (flat or unknown structure)
func DefaultStrategy(fileType string) string {
	switch fileType {
	case "markdown", "html":
		return "heading"
	default:
		return "fixedsize"
	}
}
