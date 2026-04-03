package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/helloworld/rag/config"
	"github.com/helloworld/rag/internal/embedder"
	"github.com/helloworld/rag/internal/generator"
	"github.com/helloworld/rag/internal/store"
)

func main() {
	query := flag.String("q", "", "The question to answer (required)")
	topK := flag.Int("topk", 3, "Number of chunks to retrieve")
	collection := flag.String("collection", "", "Qdrant collection (default: rag-<embedding-model>)")
	cfgPath := flag.String("config", "config.yaml", "Path to config.yaml")
	flag.Parse()

	if *query == "" {
		fmt.Fprintln(os.Stderr, "error: --q is required")
		flag.Usage()
		os.Exit(1)
	}

	ctx := context.Background()

	cfg, err := config.Load(*cfgPath)
	if err != nil {
		log.Fatalf("config: %v", err)
	}
	if *collection == "" {
		*collection = defaultCollection(cfg.Embedding.Model)
	}

	// Step 1: Embed query
	fmt.Printf("\n[1/3] Embedding query (model=%s)\n", cfg.Embedding.Model)
	emb, err := embedder.New(embedder.Config{
		Host:   cfg.Embedding.Host,
		Model:  cfg.Embedding.Model,
		APIKey: cfg.Embedding.APIKey,
	})
	if err != nil {
		log.Fatalf("embedder: %v", err)
	}
	vecs, err := emb.Embed(ctx, []string{*query})
	if err != nil {
		log.Fatalf("embed query: %v", err)
	}
	queryVec := vecs[0]
	fmt.Printf("      query vector dims=%d\n", len(queryVec))

	// Step 2: Search
	fmt.Printf("\n[2/3] Searching collection %q (topk=%d)\n", *collection, *topK)
	vs, err := store.New(store.Config{
		Type: cfg.VectorStore.Type,
		Host: cfg.VectorStore.Host,
		Port: cfg.VectorStore.Port,
	})
	if err != nil {
		log.Fatalf("qdrant connect: %v", err)
	}
	results, err := vs.Search(ctx, *collection, queryVec, *topK)
	if err != nil {
		log.Fatalf("search: %v", err)
	}
	if len(results) == 0 {
		fmt.Println("No results found. Run cmd/index first.")
		os.Exit(0)
	}

	fmt.Printf("      retrieved %d chunks:\n", len(results))
	contextTexts := make([]string, len(results))
	for i, r := range results {
		fmt.Printf("\n  -- Chunk %d (score=%.4f) --\n", i+1, r.Score)
		fmt.Printf("     source=%s  heading=%q\n", r.Chunk.Metadata["source"], r.Chunk.Metadata["heading"])
		preview := []rune(r.Chunk.Text)
		if len(preview) > 120 {
			preview = preview[:120]
		}
		fmt.Printf("     %s...\n", string(preview))
		contextTexts[i] = r.Chunk.Text
	}

	// Step 3: Generate
	fmt.Printf("\n[3/3] Generating answer (model=%s)\n", cfg.Chat.Model)
	gen, err := generator.New(generator.Config{
		Host:   cfg.Chat.Host,
		Model:  cfg.Chat.Model,
		APIKey: cfg.Chat.APIKey,
	})
	if err != nil {
		log.Fatalf("generator: %v", err)
	}
	sysPrompt := generator.BuildRAGPrompt(contextTexts)
	answer, err := gen.Generate(ctx, sysPrompt, *query)
	if err != nil {
		log.Fatalf("generate: %v", err)
	}

	fmt.Println("\n" + strings.Repeat("-", 60))
	fmt.Printf("Q: %s\n\n", *query)
	fmt.Printf("A: %s\n", answer)
	fmt.Println(strings.Repeat("-", 60))
	fmt.Printf("\nSources:\n")
	for i, r := range results {
		fmt.Printf("  [%d] %s (score=%.4f)\n", i+1, r.Chunk.Metadata["source"], r.Score)
	}
}

func defaultCollection(model string) string {
	r := strings.NewReplacer("/", "-", ".", "-", ":", "-", " ", "-")
	return "rag-" + r.Replace(model)
}
