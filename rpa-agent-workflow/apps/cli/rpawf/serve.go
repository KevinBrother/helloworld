package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"sync"

	"rpa-agent-workflow/compiler/go/compiler"
	"rpa-agent-workflow/compiler/go/diagnostic"
	"rpa-agent-workflow/compiler/go/schema"
	"rpa-agent-workflow/compiler/go/transform"
	"rpa-agent-workflow/contracts/ast"
	"rpa-agent-workflow/contracts/block"
	editoperation "rpa-agent-workflow/contracts/edit-operation"
	uinode "rpa-agent-workflow/contracts/ui-node"
)

const defaultServeAddr = "127.0.0.1:8787"

type editorStateResponse struct {
	AST         ast.Workflow            `json:"ast"`
	UI          uinode.Document         `json:"ui"`
	Diagnostics []diagnostic.Diagnostic `json:"diagnostics"`
	Operation   *editoperation.Document `json:"operation,omitempty"`
}

type editorServer struct {
	mu       sync.Mutex
	workflow ast.Workflow
	blocks   map[string]block.Definition
	astPath  string
}

func newEditorServer(workflow ast.Workflow, blocks map[string]block.Definition) http.Handler {
	return newEditorServerWithPath(workflow, blocks, "")
}

func newEditorServerWithPath(workflow ast.Workflow, blocks map[string]block.Definition, astPath string) http.Handler {
	server := &editorServer{
		workflow: workflow,
		blocks:   blocks,
		astPath:  astPath,
	}
	mux := http.NewServeMux()
	mux.HandleFunc("/api/workflow", server.handleWorkflow)
	mux.HandleFunc("/api/edit", server.handleEdit)
	return mux
}

func (s *editorServer) handleWorkflow(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	s.mu.Lock()
	workflow := s.workflow
	s.mu.Unlock()

	respondJSON(w, http.StatusOK, editorStateResponse{
		AST:         workflow,
		UI:          transform.ProjectWorkflow(workflow),
		Diagnostics: s.validateWorkflow(workflow),
	})
}

func (s *editorServer) handleEdit(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var op editoperation.Document
	if err := json.NewDecoder(r.Body).Decode(&op); err != nil {
		respondDiagnostics(w, http.StatusBadRequest, diagnostic.Diagnostic{
			Code:     "EDIT_JSON_INVALID",
			Severity: diagnostic.SeverityError,
			Message:  fmt.Sprintf("invalid edit operation json: %v", err),
			Path:     "$",
		})
		return
	}
	if diag := validateEditOperation(op); diag != nil {
		respondDiagnostics(w, http.StatusBadRequest, *diag)
		return
	}

	s.mu.Lock()
	current := s.workflow
	updated, diags := transform.ApplyEdit(current, op)
	if len(diags) > 0 {
		s.mu.Unlock()
		respondDiagnostics(w, http.StatusBadRequest, diags...)
		return
	}
	if diags := s.validateWorkflow(updated); len(diags) > 0 {
		s.mu.Unlock()
		respondDiagnostics(w, http.StatusBadRequest, diags...)
		return
	}
	if err := s.persistWorkflow(updated); err != nil {
		s.mu.Unlock()
		respondDiagnostics(w, http.StatusInternalServerError, diagnostic.Diagnostic{
			Code:     "AST_PERSIST_FAILED",
			Severity: diagnostic.SeverityError,
			Message:  fmt.Sprintf("failed to persist ast: %v", err),
			Path:     "$",
		})
		return
	}
	s.workflow = updated
	s.mu.Unlock()

	respondJSON(w, http.StatusOK, editorStateResponse{
		AST:         updated,
		UI:          transform.ProjectWorkflow(updated),
		Diagnostics: nil,
		Operation:   &op,
	})
}

func (s *editorServer) validateWorkflow(workflow ast.Workflow) []diagnostic.Diagnostic {
	data, err := json.Marshal(workflow)
	if err != nil {
		return []diagnostic.Diagnostic{{
			Code:     "AST_JSON_INVALID",
			Severity: diagnostic.SeverityError,
			Message:  fmt.Sprintf("workflow cannot be encoded: %v", err),
			Path:     "$",
		}}
	}
	if err := schema.ValidateAstBytes(data); err != nil {
		return []diagnostic.Diagnostic{{
			Code:     "AST_SCHEMA_INVALID",
			Severity: diagnostic.SeverityError,
			Message:  err.Error(),
			Path:     "$",
		}}
	}
	if s.blocks == nil {
		return nil
	}
	_, diags := compiler.ValidateWorkflow(data, s.blocks)
	return diags
}

func validateEditOperation(op editoperation.Document) *diagnostic.Diagnostic {
	if op.SchemaVersion == "" {
		return editDiagnostic("EDIT_SCHEMA_VERSION_MISSING", "edit operation requires schemaVersion", "$.schemaVersion")
	}
	if op.OperationID == "" {
		return editDiagnostic("EDIT_OPERATION_ID_MISSING", "edit operation requires operationId", "$.operationId")
	}
	if op.Type == "" {
		return editDiagnostic("EDIT_TYPE_MISSING", "edit operation requires type", "$.type")
	}
	switch op.Type {
	case editoperation.OperationTypeToggleCollapsed:
		if op.TargetNodeID == "" {
			return editDiagnostic("EDIT_TARGET_MISSING", "toggleCollapsed requires targetNodeId", "$.targetNodeId")
		}
		if op.Payload == nil {
			return editDiagnostic("EDIT_PAYLOAD_MISSING", "toggleCollapsed requires payload", "$.payload")
		}
	case editoperation.OperationTypeUpdateField:
		if op.TargetNodeID == "" {
			return editDiagnostic("EDIT_TARGET_MISSING", "updateField requires targetNodeId", "$.targetNodeId")
		}
		if op.Path == "" {
			return editDiagnostic("EDIT_PATH_MISSING", "updateField requires path", "$.path")
		}
		if op.Payload == nil {
			return editDiagnostic("EDIT_PAYLOAD_MISSING", "updateField requires payload", "$.payload")
		}
		if _, ok := op.Payload["value"]; !ok {
			return editDiagnostic("EDIT_VALUE_MISSING", "updateField payload requires value", "$.payload.value")
		}
	default:
		return editDiagnostic("UNSUPPORTED_EDIT_OPERATION", fmt.Sprintf("unsupported edit operation %q", op.Type), "$.type")
	}
	return nil
}

func editDiagnostic(code string, message string, path string) *diagnostic.Diagnostic {
	return &diagnostic.Diagnostic{
		Code:     code,
		Severity: diagnostic.SeverityError,
		Message:  message,
		Path:     path,
	}
}

func (s *editorServer) persistWorkflow(workflow ast.Workflow) error {
	if s.astPath == "" {
		return nil
	}
	data, err := json.MarshalIndent(workflow, "", "  ")
	if err != nil {
		return err
	}
	data = append(data, '\n')
	dir := filepath.Dir(s.astPath)
	tmp, err := os.CreateTemp(dir, ".rpawf-ast-*.json")
	if err != nil {
		return err
	}
	tmpPath := tmp.Name()
	defer func() {
		_ = os.Remove(tmpPath)
	}()
	if _, err := tmp.Write(data); err != nil {
		_ = tmp.Close()
		return err
	}
	if err := tmp.Close(); err != nil {
		return err
	}
	return os.Rename(tmpPath, s.astPath)
}

func respondDiagnostics(w http.ResponseWriter, status int, diags ...diagnostic.Diagnostic) {
	respondJSON(w, status, editorStateResponse{
		Diagnostics: diags,
	})
}

func respondJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

func runServeCommand(args []string, stdout io.Writer, stderr io.Writer) int {
	addr := defaultServeAddr
	if len(args) >= 2 && args[0] == "--addr" {
		addr = args[1]
		args = args[2:]
	}
	if len(args) < 1 || len(args) > 2 {
		fmt.Fprintln(stderr, "Usage: rpawf serve [--addr host:port] <ast.json> [block-manifest.json|blocks-dir]")
		return 2
	}

	astBytes, err := os.ReadFile(args[0])
	if err != nil {
		fmt.Fprintln(stderr, err)
		return 1
	}
	if err := schema.ValidateAstBytes(astBytes); err != nil {
		fmt.Fprintln(stderr, err)
		return 1
	}
	workflow, err := schema.LoadAst(args[0])
	if err != nil {
		fmt.Fprintln(stderr, err)
		return 1
	}

	var blocks map[string]block.Definition
	if len(args) == 2 {
		blocks, err = loadBlocks(args[1])
		if err != nil {
			fmt.Fprintln(stderr, err)
			return 1
		}
	}

	fmt.Fprintf(stdout, "serving workflow editor on http://%s\n", addr)
	if err := http.ListenAndServe(addr, newEditorServerWithPath(*workflow, blocks, args[0])); err != nil {
		fmt.Fprintln(stderr, err)
		return 1
	}
	return 0
}
