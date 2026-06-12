package main

import (
	"context"
	"log"

	"kss-agent/internal/newchatmodelagent"
)

func main() {
	if err := newchatmodelagent.Run(context.Background()); err != nil {
		log.Fatal(err)
	}
}
