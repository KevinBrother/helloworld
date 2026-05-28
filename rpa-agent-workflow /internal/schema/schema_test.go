package schema

import (
	"os"
	"testing"
)

func TestSchemaFilesExist(t *testing.T) {
	for _, path := range []string{"../../schemas/ast.schema.json", "../../schemas/block.schema.json"} {
		if _, err := os.Stat(path); err != nil {
			t.Fatal(err)
		}
	}
}
