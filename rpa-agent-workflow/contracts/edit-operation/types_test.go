package editoperation

import "testing"

func TestOperationConstants(t *testing.T) {
	if OperationTypeToggleCollapsed == "" || OperationTypeUpdateField == "" {
		t.Fatal("missing operation constants")
	}
}
