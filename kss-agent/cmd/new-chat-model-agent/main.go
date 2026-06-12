package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"

	"kss-agent/internal/newchatmodelagent"
	"kss-agent/internal/shared"
)

func main() {
	shared.LoadDotEnv()

	var instruction string
	flag.StringVar(&instruction, "instruction", shared.DefaultInstruction(), "system prompt")
	flag.Parse()

	query := shared.ResolveUserPrompt(flag.Args())
	if query == "" {
		_, _ = fmt.Fprintln(os.Stderr, shared.Usage("go run ./cmd/new-chat-model-agent"))
		os.Exit(2)
	}

	if err := newchatmodelagent.Run(context.Background(), instruction, query); err != nil {
		log.Fatal(err)
	}
}
