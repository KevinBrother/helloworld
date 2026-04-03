package loader

import (
	"fmt"
	"os"
	"strings"

	"golang.org/x/net/html"
)

// HTMLLoader parses an HTML file and converts it to Markdown-like plain text.
//
// Conversion rules:
//   - <h1>…</h1>  →  "# text\n\n"
//   - <h2>…</h2>  →  "## text\n\n"
//   - … (h3–h6 follow the same pattern)
//   - <p>          →  text + "\n\n"
//   - <li>         →  "- " + text + "\n"
//   - <br>         →  "\n"
//   - <script>, <style>, <head> → ignored entirely
//
// The output is structurally equivalent to a Markdown document, so the heading
// chunker can process HTML and Markdown files with the same logic.
type HTMLLoader struct{}

func (l *HTMLLoader) Load(path string) (*Document, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, fmt.Errorf("html loader: %w", err)
	}
	defer f.Close()

	doc, err := html.Parse(f)
	if err != nil {
		return nil, fmt.Errorf("html loader: parsing %s: %w", path, err)
	}

	var sb strings.Builder
	extractHTML(&sb, doc)

	return &Document{
		Content:  strings.TrimSpace(sb.String()),
		FileType: "html",
		Metadata: map[string]string{"source": path},
	}, nil
}

// skipTags are HTML elements whose entire subtree should be ignored.
var skipTags = map[string]bool{
	"script": true,
	"style":  true,
	"head":   true,
	"nav":    true,
	"footer": true,
}

func extractHTML(sb *strings.Builder, n *html.Node) {
	if n.Type == html.ElementNode && skipTags[n.Data] {
		return // skip this node and all its children
	}

	if n.Type == html.TextNode {
		text := strings.TrimSpace(n.Data)
		if text != "" {
			sb.WriteString(text)
		}
		return
	}

	if n.Type == html.ElementNode {
		switch n.Data {
		case "h1", "h2", "h3", "h4", "h5", "h6":
			// Write heading prefix before recursing into children.
			level := int(n.Data[1] - '0')
			sb.WriteString("\n\n")
			sb.WriteString(strings.Repeat("#", level))
			sb.WriteString(" ")
			for c := n.FirstChild; c != nil; c = c.NextSibling {
				extractHTML(sb, c)
			}
			sb.WriteString("\n\n")
			return

		case "p":
			for c := n.FirstChild; c != nil; c = c.NextSibling {
				extractHTML(sb, c)
			}
			sb.WriteString("\n\n")
			return

		case "li":
			sb.WriteString("- ")
			for c := n.FirstChild; c != nil; c = c.NextSibling {
				extractHTML(sb, c)
			}
			sb.WriteString("\n")
			return

		case "br":
			sb.WriteString("\n")
			return

		case "a":
			// Render link text only (discard href).
			for c := n.FirstChild; c != nil; c = c.NextSibling {
				extractHTML(sb, c)
			}
			return
		}
	}

	// Default: recurse into children.
	for c := n.FirstChild; c != nil; c = c.NextSibling {
		extractHTML(sb, c)
	}
}
