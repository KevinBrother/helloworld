package loader

import (
	"fmt"
	"strings"

	"github.com/ledongthuc/pdf"
)

// PDFLoader extracts plain text from a PDF file.
//
// Note: PDF text extraction is inherently lossy — heading structure is not
// reliably preserved. The output is flat text, so the fixedsize chunker is
// the better default strategy for PDF documents.
type PDFLoader struct{}

func (l *PDFLoader) Load(path string) (*Document, error) {
	f, r, err := pdf.Open(path)
	if err != nil {
		return nil, fmt.Errorf("pdf loader: opening %s: %w", path, err)
	}
	defer f.Close()

	var sb strings.Builder
	for i := 1; i <= r.NumPage(); i++ {
		page := r.Page(i)
		if page.V.IsNull() {
			continue
		}
		text, err := page.GetPlainText(nil)
		if err != nil {
			return nil, fmt.Errorf("pdf loader: reading page %d of %s: %w", i, path, err)
		}
		sb.WriteString(text)
		sb.WriteString("\n")
	}

	return &Document{
		Content:  strings.TrimSpace(sb.String()),
		FileType: "pdf",
		Metadata: map[string]string{"source": path},
	}, nil
}
