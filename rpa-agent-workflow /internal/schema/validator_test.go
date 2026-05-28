package schema

import "testing"

func TestValidateAstRejectsInvalidDocument(t *testing.T) {
	if err := ValidateAstBytes([]byte(`{"schemaVersion":"1.0.0"}`)); err == nil {
		t.Fatal("expected validation error")
	}
}
