# Go RAG Pipeline

A full Retrieval-Augmented Generation (RAG) pipeline implemented in Go, built for learning how RAG works end-to-end.

## Architecture

```
Document
   |
   v
Loader       -- reads file into plain text (Markdown / HTML / PDF / Image)
   |
   v
Chunker      -- splits text into overlapping chunks (heading-based or fixed-size)
   |
   v
Embedder     -- converts chunks to vectors (OpenAI or Ollama)
   |
   v
VectorStore  -- upserts vectors into Qdrant (via gRPC)
```

Query time reverses retrieval and generation:

```
User question
   |
   v
Embedder     -- embed the question
   |
   v
VectorStore  -- search for top-K similar chunks
   |
   v
Generator    -- build RAG prompt + call LLM (OpenAI or Ollama)
   |
   v
Answer
```

## Project Layout

```
.
├── cmd/
│   ├── index/main.go    # CLI: load, chunk, embed, store
│   └── query/main.go    # CLI: embed question, retrieve, generate
├── config/
│   └── config.go        # Config struct + YAML loader + env overrides
├── internal/
│   ├── loader/          # Document loaders (markdown, html, pdf, image)
│   ├── chunker/         # Chunking strategies (heading, fixedsize)
│   ├── embedder/        # Embedding providers (openai, ollama)
│   ├── generator/       # LLM generation providers (openai, ollama)
│   └── store/           # Vector store interface + Qdrant implementation
├── docs/                # Sample documents for testing
├── config.yaml          # Configuration template
└── docker-compose.yml   # Qdrant service
```

## Prerequisites

- Go 1.22+
- Docker (for Qdrant)
- An OpenAI API key **or** a running [Ollama](https://ollama.com) instance

## Quick Start

### 1. Start Qdrant

```bash
docker compose up -d
```

Qdrant dashboard: <http://localhost:6333/dashboard>

### 2. Configure

Copy and edit `config.yaml`:

```yaml
# Vector store backend.
vector_store:
  type: "qdrant"      # supported: qdrant (default)
  host: "localhost"
  port: 6334          # gRPC port used by the Go SDK

# Embedding model — any OpenAI-compatible endpoint works.
embedding:
  host: ""                          # empty = OpenAI; "http://localhost:11434/v1" for Ollama
  model: "text-embedding-3-small"   # or "nomic-embed-text", "mxbai-embed-large", etc.
  api_key: ""                       # or set EMBEDDING_API_KEY / OPENAI_API_KEY

# Chat model — any OpenAI-compatible endpoint works.
chat:
  host: ""              # empty = OpenAI; "http://localhost:11434/v1" for Ollama
  model: "gpt-4o-mini"  # or "llama3", "qwen2.5", "deepseek-chat", etc.
  api_key: ""           # or set CHAT_API_KEY / OPENAI_API_KEY
```

The `host` field makes switching providers trivial — no code changes needed:

| Provider | `host` value |
|---|---|
| OpenAI | _(empty)_ |
| Ollama | `http://localhost:11434/v1` |
| DeepSeek | `https://api.deepseek.com/v1` |
| Any OpenAI-compatible API | base URL of the endpoint |

All values can be overridden with environment variables:

| Variable | Description |
|---|---|
| `OPENAI_API_KEY` | Fallback API key for both embedding and chat |
| `EMBEDDING_API_KEY` | API key for the embedding endpoint |
| `EMBEDDING_HOST` | Base URL of the embedding endpoint |
| `EMBEDDING_MODEL` | Embedding model name |
| `CHAT_API_KEY` | API key for the chat endpoint |
| `CHAT_HOST` | Base URL of the chat endpoint |
| `CHAT_MODEL` | Chat model name |
| `VECTOR_STORE_TYPE` | Vector store backend (`qdrant`) |
| `VECTOR_STORE_HOST` | Vector store hostname |
| `VECTOR_STORE_PORT` | Vector store gRPC port |

### 3. Index a Document

```bash
# Index with default config (OpenAI embeddings)
go run ./cmd/index --file docs/example.md

# Index an HTML file with fixed-size chunking
go run ./cmd/index --file docs/example.html --strategy fixedsize --size 400 --overlap 80

# Use Ollama by changing config.yaml, then:
go run ./cmd/index --file docs/example.md
```

### 4. Query

```bash
# Query with default config
go run ./cmd/query --q "What is RAG?"

# Retrieve more chunks
go run ./cmd/query --q "How does chunking work?" --topk 5
```

## CLI Reference

### `go run ./cmd/index`

| Flag | Default | Description |
|---|---|---|
| `--file` | _(required)_ | Path to the document to index |
| `--strategy` | `auto` | Chunking strategy: `heading`, `fixedsize`, or `auto` |
| `--size` | `500` | Chunk size in runes (fixedsize only) |
| `--overlap` | `50` | Overlap in runes (fixedsize only) |
| `--collection` | `rag-<model>` | Qdrant collection name |
| `--config` | `config.yaml` | Path to config file |

### `go run ./cmd/query`

| Flag | Default | Description |
|---|---|---|
| `--q` | _(required)_ | The question to answer |
| `--topk` | `3` | Number of chunks to retrieve |
| `--collection` | `rag-<model>` | Qdrant collection name |
| `--config` | `config.yaml` | Path to config file |

## Supported File Types

| Extension | Loader | Default Chunker |
|---|---|---|
| `.md` | MarkdownLoader | HeadingChunker |
| `.html`, `.htm` | HTMLLoader (h1-h6 -> `#`) | HeadingChunker |
| `.pdf` | PDFLoader (flat text) | FixedSizeChunker |
| `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp` | ImageLoader | _(not implemented)_ |

## Chunking Strategies

**HeadingChunker** (`heading`): Splits at Markdown headings (`#`–`######`). Preserves document structure. Best for Markdown and HTML files.

**FixedSizeChunker** (`fixedsize`): Splits into fixed-size windows (in runes) with configurable overlap. Suitable for plain text and PDF.

**Auto** (`auto`): Selects `heading` for `.md`/`.html` files, `fixedsize` for everything else.

## Embedding & Chat Providers

Both `embedding` and `chat` in `config.yaml` use the same OpenAI-compatible API format. Switch providers by changing `host`, `model`, and `api_key` — no code changes needed.

| Use case | OpenAI | Ollama |
|---|---|---|
| `embedding.host` | _(empty)_ | `http://localhost:11434/v1` |
| `embedding.model` | `text-embedding-3-small` (1536-dim) | `nomic-embed-text` (768-dim) |
| `chat.host` | _(empty)_ | `http://localhost:11434/v1` |
| `chat.model` | `gpt-4o-mini` | `llama3`, `qwen2.5`, … |

> The embedding model used at **index** time must match the one used at **query** time. They produce vectors of different dimensions stored in separate Qdrant collections (default: `rag-<model-name>`).

## Dependencies

- [`github.com/qdrant/go-client`](https://github.com/qdrant/go-client) — Qdrant gRPC client
- [`github.com/openai/openai-go`](https://github.com/openai/openai-go) — OpenAI SDK
- [`github.com/ledongthuc/pdf`](https://github.com/ledongthuc/pdf) — PDF text extraction
- [`golang.org/x/net/html`](https://pkg.go.dev/golang.org/x/net/html) — HTML parser
- [`gopkg.in/yaml.v3`](https://pkg.go.dev/gopkg.in/yaml.v3) — YAML config
