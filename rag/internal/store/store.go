// Package store provides an abstraction over vector databases.
// The VectorStore interface covers the three operations needed for RAG:
//   - EnsureCollection: idempotent collection creation
//   - Upsert: insert or update chunks with their vectors
//   - Search: nearest-neighbor lookup by query vector
package store

import (
	"context"
	"fmt"

	"github.com/helloworld/rag/internal/chunker"
)

// SearchResult pairs a retrieved Chunk with its similarity score.
// Score is in [0, 1] for cosine distance (higher = more similar).
type SearchResult struct {
	Chunk chunker.Chunk
	Score float32
}

// VectorStore is the interface every vector database backend must implement.
type VectorStore interface {
	// EnsureCollection creates the collection if it does not already exist.
	// dims must match the Embedder.Dimensions() used during indexing.
	EnsureCollection(ctx context.Context, name string, dims uint64) error

	// DeleteCollection removes the collection and all its data.
	// Returns nil if the collection does not exist.
	DeleteCollection(ctx context.Context, name string) error

	// Upsert inserts or updates the given chunks (with their pre-computed vectors)
	// into the named collection. len(vectors) must equal len(chunks).
	Upsert(ctx context.Context, collection string, chunks []chunker.Chunk, vectors [][]float32) error

	// Search returns the topK most similar chunks to the query vector.
	Search(ctx context.Context, collection string, queryVector []float32, topK int) ([]SearchResult, error)
}

// Config specifies the vector store endpoint.
//
//   - Type: backend to use. Currently only "qdrant" is supported (default).
//   - Host: hostname of the vector store (gRPC for Qdrant).
//   - Port: port number (Qdrant gRPC default: 6334).
type Config struct {
	Type string
	Host string
	Port int
}

// New creates a VectorStore for the given configuration.
// Adding a new backend only requires a new case here and a matching file.
func New(cfg Config) (VectorStore, error) {
	switch cfg.Type {
	case "qdrant", "":
		return newQdrantStore(cfg.Host, cfg.Port)
	default:
		return nil, fmt.Errorf("store: unknown type %q (supported: qdrant)", cfg.Type)
	}
}
