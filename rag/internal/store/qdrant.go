package store

import (
	"context"
	"fmt"

	"github.com/helloworld/rag/internal/chunker"
	"github.com/qdrant/go-client/qdrant"
)

// QdrantStore implements VectorStore using the Qdrant vector database.
// It communicates over gRPC (default port 6334).
//
// Qdrant concepts relevant to RAG:
//   - Collection: a named namespace for vectors (like a table). Each collection
//     has a fixed vector size and distance metric set at creation time.
//   - Point: one vector + optional JSON payload stored in a collection.
//     In RAG, each point = one chunk (text + metadata).
//   - Cosine distance: measures the angle between two vectors.
//     Score 1.0 = identical direction (most similar), 0.0 = orthogonal.
type QdrantStore struct {
	client *qdrant.Client
}

// newQdrantStore connects to Qdrant at the given host:port (gRPC).
func newQdrantStore(host string, port int) (*QdrantStore, error) {
	client, err := qdrant.NewClient(&qdrant.Config{
		Host: host,
		Port: port,
	})
	if err != nil {
		return nil, fmt.Errorf("qdrant: connect to %s:%d: %w", host, port, err)
	}
	return &QdrantStore{client: client}, nil
}

// EnsureCollection creates the collection if it does not already exist.
// Calling this multiple times with the same name and dims is safe (idempotent).
func (s *QdrantStore) EnsureCollection(ctx context.Context, name string, dims uint64) error {
	exists, err := s.client.CollectionExists(ctx, name)
	if err != nil {
		return fmt.Errorf("qdrant: check collection %q: %w", name, err)
	}
	if exists {
		return nil
	}

	err = s.client.CreateCollection(ctx, &qdrant.CreateCollection{
		CollectionName: name,
		VectorsConfig: qdrant.NewVectorsConfig(&qdrant.VectorParams{
			Size:     dims,
			Distance: qdrant.Distance_Cosine, // cosine similarity for semantic search
		}),
	})
	if err != nil {
		return fmt.Errorf("qdrant: create collection %q: %w", name, err)
	}

	fmt.Printf("[store] created collection %q (dims=%d, distance=cosine)\n", name, dims)
	return nil
}

// DeleteCollection removes the named collection. Returns nil if it does not exist.
func (s *QdrantStore) DeleteCollection(ctx context.Context, name string) error {
	exists, err := s.client.CollectionExists(ctx, name)
	if err != nil {
		return fmt.Errorf("qdrant: check collection %q: %w", name, err)
	}
	if !exists {
		return nil
	}
	err = s.client.DeleteCollection(ctx, name)
	if err != nil {
		return fmt.Errorf("qdrant: delete collection %q: %w", name, err)
	}
	fmt.Printf("[store] deleted collection %q\n", name)
	return nil
}

// Upsert inserts or updates chunks in the collection.
// len(vectors) must equal len(chunks); each vector[i] corresponds to chunks[i].
func (s *QdrantStore) Upsert(ctx context.Context, collection string, chunks []chunker.Chunk, vectors [][]float32) error {
	if len(chunks) != len(vectors) {
		return fmt.Errorf("qdrant upsert: chunks/vectors length mismatch (%d vs %d)", len(chunks), len(vectors))
	}
	if len(chunks) == 0 {
		return nil
	}

	points := make([]*qdrant.PointStruct, len(chunks))
	for i, c := range chunks {
		// Build payload from chunk metadata + text content.
		payload := map[string]any{
			"text":   c.Text,
			"id_str": c.ID,
		}
		for k, v := range c.Metadata {
			payload[k] = v
		}

		points[i] = &qdrant.PointStruct{
			// Use a numeric ID derived from position. In production you'd use
			// a stable hash of the chunk ID string.
			Id:      qdrant.NewIDNum(uint64(i)),
			Vectors: qdrant.NewVectorsDense(vectors[i]),
			Payload: qdrant.NewValueMap(payload),
		}
	}

	_, err := s.client.Upsert(ctx, &qdrant.UpsertPoints{
		CollectionName: collection,
		Points:         points,
	})
	if err != nil {
		return fmt.Errorf("qdrant upsert into %q: %w", collection, err)
	}
	return nil
}

// Search returns the topK most similar chunks to the query vector.
// Results are sorted by score descending (most similar first).
func (s *QdrantStore) Search(ctx context.Context, collection string, queryVector []float32, topK int) ([]SearchResult, error) {
	limit := uint64(topK)
	scored, err := s.client.Query(ctx, &qdrant.QueryPoints{
		CollectionName: collection,
		Query:          qdrant.NewQuery(queryVector...),
		Limit:          &limit,
		WithPayload:    qdrant.NewWithPayload(true),
	})
	if err != nil {
		return nil, fmt.Errorf("qdrant search in %q: %w", collection, err)
	}

	results := make([]SearchResult, 0, len(scored))
	for _, pt := range scored {
		payload := pt.Payload

		// Reconstruct the Chunk from stored payload.
		c := chunker.Chunk{
			ID:       stringVal(payload, "id_str"),
			Text:     stringVal(payload, "text"),
			Metadata: map[string]string{},
		}
		for k, v := range payload {
			if k == "text" || k == "id_str" {
				continue
			}
			c.Metadata[k] = v.GetStringValue()
		}

		results = append(results, SearchResult{
			Chunk: c,
			Score: pt.Score,
		})
	}
	return results, nil
}

func stringVal(payload map[string]*qdrant.Value, key string) string {
	if v, ok := payload[key]; ok {
		return v.GetStringValue()
	}
	return ""
}
