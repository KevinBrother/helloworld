package diagnostic

import "testing"

func TestDiagnosticFormatsPath(t *testing.T) {
	d := Diagnostic{Code: "TYPE_MISMATCH", Path: "$.body[0]"}
	if d.Path != "$.body[0]" {
		t.Fatal("path not preserved")
	}
}
