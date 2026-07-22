package main

import (
	"context"
	"log/slog"
	"os"
	"time"

	"example.com/k8s-task-demo/internal/config"
	"example.com/k8s-task-demo/internal/postgres"
	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	cfg, err := config.Load()
	if err != nil {
		logger.Error("load configuration", "error", err)
		os.Exit(1)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	pool, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		logger.Error("open database", "error", err)
		os.Exit(1)
	}
	defer pool.Close()

	if err := postgres.Migrate(ctx, pool); err != nil {
		logger.Error("run migrations", "error", err)
		os.Exit(1)
	}
	logger.Info("database migrations complete")
}
