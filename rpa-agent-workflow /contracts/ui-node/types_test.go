package uinode

import "testing"

func TestDocumentHasSchemaVersion(t *testing.T) {
	var d Document
	if d.SchemaVersion != "" {
		t.Fatal("zero value should be empty")
	}
}
