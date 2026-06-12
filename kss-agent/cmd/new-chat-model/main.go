package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"

	"kss-agent/internal/newchatmodel"
	"kss-agent/internal/shared"
)

func main() {
	shared.LoadDotEnv()

	var instruction string
	flag.StringVar(&instruction, "instruction", shared.DefaultInstruction(), "system prompt")
	flag.Parse()

	query := shared.ResolveUserPrompt(flag.Args())
	if query == "" {
		_, _ = fmt.Fprintln(os.Stderr, shared.Usage("go run ./cmd/new-chat-model"))
		os.Exit(2)
	}

	if err := newchatmodel.Run(context.Background(), instruction, query); err != nil {
		log.Fatal(err)
	}
}
