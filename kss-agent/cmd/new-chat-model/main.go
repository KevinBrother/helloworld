package main

import (
	"context"
	"log"

	"kss-agent/internal/newchatmodel"
)

func main() {
	if err := newchatmodel.Run(context.Background()); err != nil {
		log.Fatal(err)
	}
}
