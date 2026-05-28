package schema

import (
	"os"
	"path/filepath"
	"testing"
)

func TestSchemaFilesExist(t *testing.T) {
	base := findSchemaDir(t)
	for _, path := range []string{filepath.Join(base, "ast.schema.json"), filepath.Join(base, "block.schema.json")} {
		if _, err := os.Stat(path); err != nil {
			t.Fatal(err)
		}
	}
}

func findSchemaDir(t *testing.T) string {
	t.Helper()
	dir, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	for {
		candidate := filepath.Join(dir, "contracts", "schemas")
		if _, err := os.Stat(candidate); err == nil {
			return candidate
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			t.Fatal("could not locate contracts/schemas")
		}
		dir = parent
	}
}
