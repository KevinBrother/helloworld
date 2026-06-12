package config

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestLoadReadsNewAPISettingsFromDotEnv(t *testing.T) {
	chdir(t, t.TempDir())
	clearConfigEnv(t)

	writeFile(t, ".env", strings.Join([]string{
		"NEW_API_BASE_URL=http://127.0.0.1:3000/v1",
		"NEW_API_KEY=sk-test",
		"NEW_API_MODEL=gpt-test",
	}, "\n"))

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}

	if cfg.BaseURL != "http://127.0.0.1:3000/v1" {
		t.Fatalf("BaseURL = %q", cfg.BaseURL)
	}
	if cfg.APIKey != "sk-test" {
		t.Fatalf("APIKey = %q", cfg.APIKey)
	}
	if cfg.Model != "gpt-test" {
		t.Fatalf("Model = %q", cfg.Model)
	}
}

func TestLoadDoesNotAppendV1ToBaseURL(t *testing.T) {
	chdir(t, t.TempDir())
	clearConfigEnv(t)

	writeFile(t, ".env", strings.Join([]string{
		"NEW_API_BASE_URL=http://127.0.0.1:3000",
		"NEW_API_KEY=sk-test",
		"NEW_API_MODEL=gpt-test",
	}, "\n"))

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}

	if cfg.BaseURL != "http://127.0.0.1:3000" {
		t.Fatalf("BaseURL = %q", cfg.BaseURL)
	}
}

func TestLoadKeepsExistingV1BaseURL(t *testing.T) {
	chdir(t, t.TempDir())
	clearConfigEnv(t)

	writeFile(t, ".env", strings.Join([]string{
		"NEW_API_BASE_URL=http://127.0.0.1:3000/v1",
		"NEW_API_KEY=sk-test",
		"NEW_API_MODEL=gpt-test",
	}, "\n"))

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}

	if cfg.BaseURL != "http://127.0.0.1:3000/v1" {
		t.Fatalf("BaseURL = %q", cfg.BaseURL)
	}
}

func TestLoadReturnsMissingRequiredSettings(t *testing.T) {
	chdir(t, t.TempDir())
	clearConfigEnv(t)

	_, err := Load()
	if err == nil {
		t.Fatal("Load() error = nil, want missing settings error")
	}

	msg := err.Error()
	for _, name := range []string{"NEW_API_BASE_URL", "NEW_API_KEY", "NEW_API_MODEL"} {
		if !strings.Contains(msg, name) {
			t.Fatalf("error %q does not mention %s", msg, name)
		}
	}
}

func chdir(t *testing.T, dir string) {
	t.Helper()

	wd, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	if err := os.Chdir(dir); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := os.Chdir(wd); err != nil {
			t.Fatal(err)
		}
	})
}

func clearConfigEnv(t *testing.T) {
	t.Helper()

	for _, name := range []string{"NEW_API_BASE_URL", "NEW_API_KEY", "NEW_API_MODEL"} {
		t.Setenv(name, "")
		if err := os.Unsetenv(name); err != nil {
			t.Fatal(err)
		}
	}
}

func writeFile(t *testing.T, name, content string) {
	t.Helper()

	if err := os.WriteFile(filepath.Clean(name), []byte(content), 0o600); err != nil {
		t.Fatal(err)
	}
}
