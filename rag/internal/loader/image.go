package loader

import "fmt"

// ImageLoader is a placeholder for image-based document loading.
//
// Future implementation options:
//  1. Vision LLM (e.g. GPT-4o vision): encode image as base64, send to
//     /v1/chat/completions with image_url content, receive text description.
//  2. OCR (e.g. Tesseract via gosseract): extract printed text from the image.
//
// To implement: replace the Load method body with the chosen strategy,
// then update DefaultStrategy() in the chunker package if needed.
type ImageLoader struct{}

func (l *ImageLoader) Load(path string) (*Document, error) {
	return nil, fmt.Errorf("image loader (%s): %w", path, ErrNotImplemented)
}
