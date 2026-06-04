package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"sync"

	"rpa-agent-workflow/compiler/go/compiler"
	"rpa-agent-workflow/compiler/go/diagnostic"
	"rpa-agent-workflow/compiler/go/executor"
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

type editorRunRequest struct {
	Inputs map[string]any `json:"inputs,omitempty"`
}

type editorRunResponse struct {
	Result      executor.Result         `json:"result,omitempty"`
	Diagnostics []diagnostic.Diagnostic `json:"diagnostics"`
}

type editorRunStreamMessage struct {
	Type        string                  `json:"type"`
	Event       *executor.Event         `json:"event,omitempty"`
	Result      *executor.Result        `json:"result,omitempty"`
	Diagnostics []diagnostic.Diagnostic `json:"diagnostics,omitempty"`
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
	mux.HandleFunc("/api/run", server.handleRun)
	mux.HandleFunc("/api/run/stream", server.handleRunStream)
	return mux
}

func (s *editorServer) handleWorkflow(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		respondDiagnostics(w, http.StatusMethodNotAllowed, methodNotAllowedDiagnostic(r.Method))
		return
	}

	s.mu.Lock()
	workflow := s.workflow
	s.mu.Unlock()

	respondJSON(w, http.StatusOK, editorStateResponse{
		AST:         workflow,
		UI:          transform.ProjectWorkflowWithBlocks(workflow, s.blocks),
		Diagnostics: s.validateWorkflow(workflow),
	})
}

func (s *editorServer) handleRun(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respondRunDiagnostics(w, http.StatusMethodNotAllowed, methodNotAllowedDiagnostic(r.Method))
		return
	}

	var req editorRunRequest
	if r.Body != nil && r.ContentLength != 0 {
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			respondRunDiagnostics(w, http.StatusBadRequest, diagnostic.Diagnostic{
				Code:     "RUN_JSON_INVALID",
				Severity: diagnostic.SeverityError,
				Message:  fmt.Sprintf("invalid run request json: %v", err),
				Path:     "$",
			})
			return
		}
	}

	s.mu.Lock()
	workflow := s.workflow
	blocks := s.blocks
	s.mu.Unlock()

	if diags := s.validateWorkflow(workflow); len(diags) > 0 {
		respondRunDiagnostics(w, http.StatusBadRequest, diags...)
		return
	}

	opts := executor.Options{
		Inputs: req.Inputs,
		Blocks: blocks,
	}
	if len(blocks) > 0 {
		opts.Host = executor.NewPythonHost(executor.PythonHostOptions{})
	}
	result, err := executor.RunWorkflow(context.Background(), workflow, opts)
	if err != nil {
		respondRunDiagnostics(w, http.StatusInternalServerError, diagnostic.Diagnostic{
			Code:     "RUN_FAILED",
			Severity: diagnostic.SeverityError,
			Message:  err.Error(),
			Path:     "$",
		})
		return
	}

	respondJSON(w, http.StatusOK, editorRunResponse{
		Result:      result,
		Diagnostics: nil,
	})
}

func (s *editorServer) handleRunStream(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		respondRunDiagnostics(w, http.StatusMethodNotAllowed, methodNotAllowedDiagnostic(r.Method))
		return
	}

	flusher, ok := w.(http.Flusher)
	if !ok {
		respondRunDiagnostics(w, http.StatusInternalServerError, diagnostic.Diagnostic{
			Code:     "RUN_STREAM_UNSUPPORTED",
			Severity: diagnostic.SeverityError,
			Message:  "server does not support streaming responses",
			Path:     "$",
		})
		return
	}

	s.mu.Lock()
	workflow := s.workflow
	blocks := s.blocks
	s.mu.Unlock()

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	send := func(message editorRunStreamMessage) bool {
		data, err := json.Marshal(message)
		if err != nil {
			return false
		}
		if _, err := fmt.Fprintf(w, "data: %s\n\n", data); err != nil {
			return false
		}
		flusher.Flush()
		return true
	}

	if diags := s.validateWorkflow(workflow); len(diags) > 0 {
		send(editorRunStreamMessage{Type: "error", Diagnostics: diags})
		return
	}

	inputs, inputDiags := parseRunStreamInputs(r)
	if len(inputDiags) > 0 {
		send(editorRunStreamMessage{Type: "error", Diagnostics: inputDiags})
		return
	}

	recorder := &sseRecorder{send: send}
	opts := executor.Options{
		Inputs:   inputs,
		Blocks:   blocks,
		Recorder: recorder,
	}
	if len(blocks) > 0 {
		opts.Host = executor.NewPythonHost(executor.PythonHostOptions{})
	}
	result, err := executor.RunWorkflow(r.Context(), workflow, opts)
	if err != nil {
		runDiagnostic := diagnostic.Diagnostic{
			Code:     "RUN_FAILED",
			Severity: diagnostic.SeverityError,
			Message:  err.Error(),
			Path:     "$",
		}
		var runtimeErr *executor.RuntimeError
		if errors.As(err, &runtimeErr) && runtimeErr.StatementID != "" {
			event := executor.Event{
				Name:          "run.error",
				WorkflowID:    runtimeErr.WorkflowID,
				StatementID:   runtimeErr.StatementID,
				StatementKind: runtimeErr.StatementKind,
			}
			send(editorRunStreamMessage{Type: "error", Event: &event, Diagnostics: []diagnostic.Diagnostic{runDiagnostic}})
			return
		}
		send(editorRunStreamMessage{Type: "error", Diagnostics: []diagnostic.Diagnostic{runDiagnostic}})
		return
	}

	send(editorRunStreamMessage{Type: "result", Result: &result})
}

func parseRunStreamInputs(r *http.Request) (map[string]any, []diagnostic.Diagnostic) {
	rawInputs := r.URL.Query().Get("inputs")
	if rawInputs == "" {
		return nil, nil
	}
	var inputs map[string]any
	if err := json.Unmarshal([]byte(rawInputs), &inputs); err != nil {
		return nil, []diagnostic.Diagnostic{{
			Code:     "RUN_INPUTS_INVALID",
			Severity: diagnostic.SeverityError,
			Message:  fmt.Sprintf("invalid run inputs json: %v", err),
			Path:     "$.inputs",
		}}
	}
	return inputs, nil
}

type sseRecorder struct {
	mu   sync.Mutex
	send func(editorRunStreamMessage) bool
}

func (r *sseRecorder) Record(event executor.Event) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.send(editorRunStreamMessage{Type: "trace", Event: &event})
}

func (s *editorServer) handleEdit(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respondDiagnostics(w, http.StatusMethodNotAllowed, methodNotAllowedDiagnostic(r.Method))
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
		UI:          transform.ProjectWorkflowWithBlocks(updated, s.blocks),
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

func methodNotAllowedDiagnostic(method string) diagnostic.Diagnostic {
	return diagnostic.Diagnostic{
		Code:     "METHOD_NOT_ALLOWED",
		Severity: diagnostic.SeverityError,
		Message:  fmt.Sprintf("method %s is not allowed", method),
		Path:     "$",
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

func respondRunDiagnostics(w http.ResponseWriter, status int, diags ...diagnostic.Diagnostic) {
	respondJSON(w, status, editorRunResponse{
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
