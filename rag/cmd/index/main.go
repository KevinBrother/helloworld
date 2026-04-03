package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/helloworld/rag/config"
	"github.com/helloworld/rag/internal/chunker"
	"github.com/helloworld/rag/internal/embedder"
	"github.com/helloworld/rag/internal/loader"
	"github.com/helloworld/rag/internal/store"
)

func main() {
	file := flag.String("file", "", "Path to the document to index (required)")
	strategy := flag.String("strategy", "auto", "Chunking strategy: heading | fixedsize | auto")
	size := flag.Int("size", 500, "Chunk size in runes (fixedsize only)")
	overlap := flag.Int("overlap", 50, "Overlap in runes (fixedsize only)")
	collection := flag.String("collection", "", "Qdrant collection name (default: rag-<model>)")
	recreate := flag.Bool("recreate", false, "Delete and recreate the collection before indexing")
	cfgPath := flag.String("config", "config.yaml", "Path to config.yaml")
	flag.Parse()

	if *file == "" {
		fmt.Fprintln(os.Stderr, "error: --file is required")
		flag.Usage()
		os.Exit(1)
	}

	ctx := context.Background()

	cfg, err := config.Load(*cfgPath)
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	// Step 1: Load
	fmt.Printf("\n[1/4] Loading %s\n", *file)
	ld, err := loader.New(*file)
	if err != nil {
		log.Fatalf("loader: %v", err)
	}
	doc, err := ld.Load(*file)
	if err != nil {
		log.Fatalf("load file: %v", err)
	}
	fmt.Printf("      filetype=%s  content_length=%d chars\n", doc.FileType, len(doc.Content))

	// Step 2: Chunk
	fmt.Printf("\n[2/4] Chunking (strategy=%s)\n", *strategy)
	if *strategy == "auto" {
		*strategy = chunker.DefaultStrategy(doc.FileType)
		fmt.Printf("      auto-selected: %s\n", *strategy)
	}

	var chunks []chunker.Chunk
	switch *strategy {
	case "heading":
		chunks, err = (&chunker.HeadingChunker{}).Chunk(doc)
	case "fixedsize":
		chunks, err = chunker.NewFixedSizeChunker(*size, *overlap).Chunk(doc)
	default:
		log.Fatalf("unknown strategy %q", *strategy)
	}
	if err != nil {
		log.Fatalf("chunk: %v", err)
	}
	fmt.Printf("      produced %d chunks\n", len(chunks))
	for i, c := range chunks {
		preview := []rune(c.Text)
		if len(preview) > 60 {
			preview = preview[:60]
		}
		fmt.Printf("      [%d] heading=%q len=%d preview: %s...\n",
			i, c.Metadata["heading"], len([]rune(c.Text)), string(preview))
	}

	// Step 3: Embed
	if *collection == "" {
		*collection = defaultCollection(cfg.Embedding.Model)
	}
	fmt.Printf("\n[3/4] Embedding (host=%q model=%s)\n", cfg.Embedding.Host, cfg.Embedding.Model)
	emb, err := embedder.New(embedder.Config{
		Host:   cfg.Embedding.Host,
		Model:  cfg.Embedding.Model,
		APIKey: cfg.Embedding.APIKey,
	})
	if err != nil {
		log.Fatalf("embedder: %v", err)
	}

	texts := make([]string, len(chunks))
	for i, c := range chunks {
		texts[i] = c.Text
	}
	const batchSize = 20
	allVectors := make([][]float32, 0, len(chunks))
	for i := 0; i < len(texts); i += batchSize {
		end := i + batchSize
		if end > len(texts) {
			end = len(texts)
		}
		vecs, err := emb.Embed(ctx, texts[i:end])
		if err != nil {
			log.Fatalf("embed batch [%d:%d]: %v", i, end, err)
		}
		allVectors = append(allVectors, vecs...)
		fmt.Printf("      embedded [%d-%d] dims=%d\n", i, end-1, len(vecs[0]))
	}

	// Step 4: Upsert
	fmt.Printf("\n[4/4] Storing into vector store (type=%s host=%s:%d collection=%q)\n",
		cfg.VectorStore.Type, cfg.VectorStore.Host, cfg.VectorStore.Port, *collection)
	vs, err := store.New(store.Config{
		Type: cfg.VectorStore.Type,
		Host: cfg.VectorStore.Host,
		Port: cfg.VectorStore.Port,
	})
	if err != nil {
		log.Fatalf("qdrant connect: %v", err)
	}
	if *recreate {
		if err := vs.DeleteCollection(ctx, *collection); err != nil {
			log.Fatalf("delete collection: %v", err)
		}
	}
	if err := vs.EnsureCollection(ctx, *collection, uint64(emb.Dimensions())); err != nil {
		log.Fatalf("ensure collection: %v", err)
	}
	if err := vs.Upsert(ctx, *collection, chunks, allVectors); err != nil {
		log.Fatalf("upsert: %v", err)
	}

	fmt.Printf("\n[ok] Indexed %d chunks into collection %q\n", len(chunks), *collection)
	if cfg.VectorStore.Type == "" || cfg.VectorStore.Type == "qdrant" {
		fmt.Printf("     Dashboard: http://%s:6333/dashboard\n", cfg.VectorStore.Host)
	}
}

func defaultCollection(model string) string {
	r := strings.NewReplacer("/", "-", ".", "-", ":", "-", " ", "-")
	return "rag-" + r.Replace(model)
}
