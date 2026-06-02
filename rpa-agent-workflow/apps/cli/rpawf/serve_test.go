package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"rpa-agent-workflow/compiler/go/diagnostic"
	"rpa-agent-workflow/compiler/go/executor"
	"rpa-agent-workflow/contracts/ast"
	editoperation "rpa-agent-workflow/contracts/edit-operation"
	uinode "rpa-agent-workflow/contracts/ui-node"
)

func TestEditorServerWorkflowReturnsProjectedState(t *testing.T) {
	server := newEditorServer(testEditorWorkflow(), nil)

	response := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/workflow", nil)
	server.ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d: %s", response.Code, http.StatusOK, response.Body.String())
	}

	var state testEditorStateResponse
	decodeResponse(t, response, &state)
	if state.AST.Workflow.ID != "editor_test" {
		t.Fatalf("workflow id = %q, want editor_test", state.AST.Workflow.ID)
	}
	if state.UI.WorkflowID != "editor_test" {
		t.Fatalf("ui workflow id = %q, want editor_test", state.UI.WorkflowID)
	}
	if len(state.Diagnostics) != 0 {
		t.Fatalf("diagnostics = %#v, want none", state.Diagnostics)
	}
}

func TestEditorServerApplyUpdateFieldReturnsUpdatedProjection(t *testing.T) {
	server := newEditorServer(testEditorWorkflow(), nil)
	op := editoperation.Document{
		SchemaVersion: "1.0.0",
		OperationID:   "update-value",
		Type:          editoperation.OperationTypeUpdateField,
		TargetNodeID:  "assign_count",
		Path:          "$.body.statements[0].value",
		Payload: map[string]any{
			"value": map[string]any{"kind": "literal", "value": float64(2)},
		},
	}

	response := postEdit(t, server, op)

	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d: %s", response.Code, http.StatusOK, response.Body.String())
	}

	var state testEditorStateResponse
	decodeResponse(t, response, &state)
	updated := state.AST.Body.Statements[0].Value
	if updated == nil || updated.Kind != "literal" || updated.Value != float64(2) {
		t.Fatalf("updated value = %#v, want literal 2", updated)
	}
	field := findInspectorField(state.UI.Root.Children[0], "$.body.statements[0].value")
	if field == nil {
		t.Fatal("updated ui projection did not include assign value inspector field")
	}
	value, ok := field.Value.(map[string]any)
	if !ok || value["kind"] != "literal" || value["value"] != float64(2) {
		t.Fatalf("inspector value = %#v, want literal 2", field.Value)
	}
}

func TestEditorServerRejectsInvalidEditWithoutChangingState(t *testing.T) {
	server := newEditorServer(testEditorWorkflow(), nil)
	op := editoperation.Document{
		SchemaVersion: "1.0.0",
		OperationID:   "invalid-value",
		Type:          editoperation.OperationTypeUpdateField,
		TargetNodeID:  "assign_count",
		Path:          "$.body.statements[0].value",
		Payload: map[string]any{
			"value": map[string]any{"value": float64(2)},
		},
	}

	response := postEdit(t, server, op)

	if response.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d: %s", response.Code, http.StatusBadRequest, response.Body.String())
	}

	followup := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/workflow", nil)
	server.ServeHTTP(followup, request)

	var state testEditorStateResponse
	decodeResponse(t, followup, &state)
	current := state.AST.Body.Statements[0].Value
	if current == nil || current.Kind != "literal" || current.Value != float64(1) {
		t.Fatalf("state changed after rejected edit: %#v", current)
	}
}

func TestEditorServerPersistsAcceptedEditToASTFile(t *testing.T) {
	workflow := testEditorWorkflow()
	astPath := filepath.Join(t.TempDir(), "ast.json")
	initial, err := json.MarshalIndent(workflow, "", "  ")
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(astPath, append(initial, '\n'), 0o644); err != nil {
		t.Fatal(err)
	}
	server := newEditorServerWithPath(workflow, nil, astPath)
	op := editoperation.Document{
		SchemaVersion: "1.0.0",
		OperationID:   "persist-value",
		Type:          editoperation.OperationTypeUpdateField,
		TargetNodeID:  "assign_count",
		Path:          "$.body.statements[0].value",
		Payload: map[string]any{
			"value": map[string]any{"kind": "literal", "value": float64(12)},
		},
	}

	response := postEdit(t, server, op)

	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d: %s", response.Code, http.StatusOK, response.Body.String())
	}
	var persisted ast.Workflow
	raw, err := os.ReadFile(astPath)
	if err != nil {
		t.Fatal(err)
	}
	if err := json.Unmarshal(raw, &persisted); err != nil {
		t.Fatalf("persisted ast json is invalid: %v\n%s", err, raw)
	}
	value := persisted.Body.Statements[0].Value
	if value == nil || value.Kind != "literal" || value.Value != float64(12) {
		t.Fatalf("persisted value = %#v, want literal 12", value)
	}
}

func TestEditorServerRunReturnsCurrentWorkflowResult(t *testing.T) {
	server := newEditorServer(testRunnableWorkflow(), nil)

	response := postRun(t, server, nil)

	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d: %s", response.Code, http.StatusOK, response.Body.String())
	}
	var result testRunResponse
	decodeResponse(t, response, &result)
	if got := result.Result.Returns["result"]; got != float64(19) {
		t.Fatalf("result = %#v, want 19", got)
	}
}

func testEditorWorkflow() ast.Workflow {
	return ast.Workflow{
		SchemaVersion: "1.0.0",
		Workflow: ast.Metadata{
			ID:   "editor_test",
			Name: "Editor Test",
		},
		Variables: []ast.Variable{
			{Name: "count", Type: ast.Type{Name: "number"}, Mutable: true},
		},
		Body: ast.Statement{
			ID:   "root",
			Kind: "sequence",
			Statements: []ast.Statement{
				{
					ID:     "assign_count",
					Kind:   "assign",
					Target: "count",
					Value:  &ast.Expression{Kind: "literal", Value: float64(1)},
				},
				{
					ID:   "return_count",
					Kind: "return",
					Returns: map[string]ast.Expression{
						"count": {Kind: "ref", Ref: "var.count"},
					},
				},
			},
		},
	}
}

func testRunnableWorkflow() ast.Workflow {
	return ast.Workflow{
		SchemaVersion: "1.0.0",
		Workflow:      ast.Metadata{ID: "runnable"},
		Variables: []ast.Variable{
			{Name: "result", Type: ast.Type{Name: "number"}, Mutable: true},
		},
		Body: ast.Statement{
			ID:   "root",
			Kind: "sequence",
			Statements: []ast.Statement{
				{
					ID:     "assign_result",
					Kind:   "assign",
					Target: "result",
					Value: &ast.Expression{
						Kind:  "binary",
						Op:    "+",
						Left:  &ast.Expression{Kind: "literal", Value: float64(7)},
						Right: &ast.Expression{Kind: "literal", Value: float64(12)},
					},
				},
				{
					ID:   "return_result",
					Kind: "return",
					Returns: map[string]ast.Expression{
						"result": {Kind: "ref", Ref: "var.result"},
					},
				},
			},
		},
	}
}

func postEdit(t *testing.T, server http.Handler, op editoperation.Document) *httptest.ResponseRecorder {
	t.Helper()
	body, err := json.Marshal(op)
	if err != nil {
		t.Fatal(err)
	}
	response := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/api/edit", bytes.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	server.ServeHTTP(response, request)
	return response
}

func postRun(t *testing.T, server http.Handler, payload any) *httptest.ResponseRecorder {
	t.Helper()
	var body bytes.Buffer
	if payload != nil {
		if err := json.NewEncoder(&body).Encode(payload); err != nil {
			t.Fatal(err)
		}
	}
	response := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/api/run", &body)
	request.Header.Set("Content-Type", "application/json")
	server.ServeHTTP(response, request)
	return response
}

func decodeResponse(t *testing.T, response *httptest.ResponseRecorder, target any) {
	t.Helper()
	if err := json.Unmarshal(response.Body.Bytes(), target); err != nil {
		t.Fatalf("decode response: %v\n%s", err, response.Body.String())
	}
}

func findInspectorField(node uinode.Node, path string) *uinode.InspectorField {
	for i := range node.Inspector {
		if node.Inspector[i].Path == path {
			return &node.Inspector[i]
		}
	}
	return nil
}

type testEditorStateResponse struct {
	AST         ast.Workflow            `json:"ast"`
	UI          uinode.Document         `json:"ui"`
	Diagnostics []diagnostic.Diagnostic `json:"diagnostics"`
	Operation   *editoperation.Document `json:"operation,omitempty"`
}

type testRunResponse struct {
	Result      executor.Result         `json:"result"`
	Diagnostics []diagnostic.Diagnostic `json:"diagnostics"`
}
