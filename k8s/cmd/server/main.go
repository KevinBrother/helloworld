package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"example.com/k8s-task-demo/internal/config"
	"example.com/k8s-task-demo/internal/httpserver"
	"example.com/k8s-task-demo/internal/postgres"
	"example.com/k8s-task-demo/internal/task"
	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))

	cfg, err := config.Load()
	if err != nil {
		logger.Error("load configuration", "error", err)
		os.Exit(1)
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	if err := run(ctx, cfg, logger); err != nil {
		logger.Error("server stopped", "error", err)
		os.Exit(1)
	}
}

func run(ctx context.Context, cfg config.Config, logger *slog.Logger) error {
	pool, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		return fmt.Errorf("open database pool: %w", err)
	}
	defer pool.Close()

	startupCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	if err := pool.Ping(startupCtx); err != nil {
		return fmt.Errorf("connect to database: %w", err)
	}

	repository := postgres.NewRepository(pool)
	service := task.NewService(repository)
	handler := httpserver.New(httpserver.Options{Service: service, Logger: logger})

	listener, err := net.Listen("tcp", cfg.HTTPAddr)
	if err != nil {
		return fmt.Errorf("listen on %s: %w", cfg.HTTPAddr, err)
	}

	server := &http.Server{
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	logger.Info("server listening",
		"address", listener.Addr().String(),
		"environment", cfg.AppEnv,
	)
	return serve(ctx, server, listener, cfg.ShutdownTimeout)
}

func serve(ctx context.Context, server *http.Server, listener net.Listener, shutdownTimeout time.Duration) error {
	serverError := make(chan error, 1)
	go func() {
		serverError <- server.Serve(listener)
	}()

	select {
	case err := <-serverError:
		if errors.Is(err, http.ErrServerClosed) {
			return nil
		}
		return err
	case <-ctx.Done():
		shutdownCtx, cancel := context.WithTimeout(context.Background(), shutdownTimeout)
		defer cancel()
		if err := server.Shutdown(shutdownCtx); err != nil {
			return fmt.Errorf("graceful shutdown: %w", err)
		}
		err := <-serverError
		if errors.Is(err, http.ErrServerClosed) {
			return nil
		}
		return err
	}
}
