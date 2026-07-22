package config

import (
	"strings"
	"testing"
	"time"
)

func TestLoadDefaults(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://task:secret@postgres:5432/taskdb?sslmode=disable")
	t.Setenv("HTTP_ADDR", "")
	t.Setenv("APP_ENV", "")
	t.Setenv("SHUTDOWN_TIMEOUT", "")

	got, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}
	if got.HTTPAddr != ":8080" {
		t.Fatalf("HTTPAddr = %q, want :8080", got.HTTPAddr)
	}
	if got.AppEnv != "development" {
		t.Fatalf("AppEnv = %q, want development", got.AppEnv)
	}
	if got.ShutdownTimeout != 10*time.Second {
		t.Fatalf("ShutdownTimeout = %s, want 10s", got.ShutdownTimeout)
	}
}

func TestLoadUsesConfiguredValues(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://task:secret@postgres:5432/taskdb?sslmode=disable")
	t.Setenv("HTTP_ADDR", "127.0.0.1:9090")
	t.Setenv("APP_ENV", "test")
	t.Setenv("SHUTDOWN_TIMEOUT", "3s")

	got, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}
	if got.HTTPAddr != "127.0.0.1:9090" || got.AppEnv != "test" || got.ShutdownTimeout != 3*time.Second {
		t.Fatalf("Load() = %#v, want configured values", got)
	}
}

func TestLoadRequiresDatabaseURL(t *testing.T) {
	t.Setenv("DATABASE_URL", "")

	_, err := Load()

	if err == nil || !strings.Contains(err.Error(), "DATABASE_URL") {
		t.Fatalf("Load() error = %v, want DATABASE_URL validation error", err)
	}
}

func TestLoadRejectsInvalidShutdownTimeout(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://task:secret@postgres:5432/taskdb?sslmode=disable")
	t.Setenv("SHUTDOWN_TIMEOUT", "soon")

	_, err := Load()

	if err == nil || !strings.Contains(err.Error(), "SHUTDOWN_TIMEOUT") {
		t.Fatalf("Load() error = %v, want SHUTDOWN_TIMEOUT validation error", err)
	}
}

func TestLoadRejectsNonPositiveShutdownTimeout(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://task:secret@postgres:5432/taskdb?sslmode=disable")
	t.Setenv("SHUTDOWN_TIMEOUT", "0s")

	_, err := Load()

	if err == nil || !strings.Contains(err.Error(), "SHUTDOWN_TIMEOUT") {
		t.Fatalf("Load() error = %v, want positive SHUTDOWN_TIMEOUT validation error", err)
	}
}
