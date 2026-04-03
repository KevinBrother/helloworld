package loader

import (
	"errors"
	"fmt"
	"path/filepath"
	"strings"
)

// ErrNotImplemented is returned by loaders that are defined but not yet implemented.
var ErrNotImplemented = errors.New("loader not implemented for this file type")

// Document is the unified output of every Loader.
// Content is plain text (Markdown-like for structured formats, flat for PDF/image).
// FileType signals to downstream components (e.g. chunker) what kind of text to expect.
type Document struct {
	Content  string
	FileType string            // "markdown" | "html" | "pdf" | "image"
	Metadata map[string]string // "source" -> file path, extensible
}

// Loader reads a file and returns a Document.
type Loader interface {
	Load(path string) (*Document, error)
}

// New returns the appropriate Loader for the given file path based on its extension.
// To add support for a new file type: implement Loader, then add a case here.
func New(path string) (Loader, error) {
	ext := strings.ToLower(filepath.Ext(path))
	switch ext {
	case ".md", ".markdown":
		return &MarkdownLoader{}, nil
	case ".html", ".htm":
		return &HTMLLoader{}, nil
	case ".pdf":
		return &PDFLoader{}, nil
	case ".png", ".jpg", ".jpeg", ".webp", ".gif":
		return &ImageLoader{}, nil
	default:
		return nil, fmt.Errorf("unsupported file extension %q", ext)
	}
}
