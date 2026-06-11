package main

import (
	"context"
	"log"

	"kss-agent/internal/app"
)

func main() {
	if err := app.Run(context.Background()); err != nil {
		log.Fatal(err)
	}
}
