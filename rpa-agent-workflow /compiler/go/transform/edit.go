package transform

import (
	"fmt"
	"strings"

	"rpa-agent-workflow/compiler/go/diagnostic"
	"rpa-agent-workflow/contracts/ast"
	editoperation "rpa-agent-workflow/contracts/edit-operation"
)

func ApplyEdit(workflow ast.Workflow, op editoperation.Document) (ast.Workflow, []diagnostic.Diagnostic) {
	switch op.Type {
	case editoperation.OperationTypeToggleCollapsed:
		return applyToggleCollapsed(workflow, op)
	case editoperation.OperationTypeUpdateField:
		return applyUpdateField(workflow, op)
	default:
		return workflow, []diagnostic.Diagnostic{{
			Code:     "UNSUPPORTED_EDIT_OPERATION",
			Severity: diagnostic.SeverityError,
			Message:  fmt.Sprintf("unsupported edit operation %q", op.Type),
			Path:     "$.type",
		}}
	}
}

func applyToggleCollapsed(workflow ast.Workflow, op editoperation.Document) (ast.Workflow, []diagnostic.Diagnostic) {
	stmt := findStatementByID(&workflow.Body, op.TargetNodeID)
	if stmt == nil {
		return workflow, []diagnostic.Diagnostic{notFoundDiagnostic(op.TargetNodeID)}
	}
	collapsed := !metadataCollapsed(stmt.Metadata)
	if value, ok := op.Payload["collapsed"].(bool); ok {
		collapsed = value
	}
	ensureStatementUIMetadata(stmt)["collapsed"] = collapsed
	return workflow, nil
}

func applyUpdateField(workflow ast.Workflow, op editoperation.Document) (ast.Workflow, []diagnostic.Diagnostic) {
	if !strings.HasPrefix(op.Path, "metadata.") {
		return workflow, []diagnostic.Diagnostic{{
			Code:     "UNSAFE_EDIT_PATH",
			Severity: diagnostic.SeverityError,
			Message:  "updateField currently supports metadata paths only",
			Path:     "$.path",
		}}
	}
	value, ok := op.Payload["value"]
	if !ok {
		return workflow, []diagnostic.Diagnostic{{
			Code:     "MISSING_EDIT_VALUE",
			Severity: diagnostic.SeverityError,
			Message:  "updateField payload requires value",
			Path:     "$.payload.value",
		}}
	}

	if op.TargetNodeID == "" || op.TargetNodeID == workflow.Body.ID {
		workflow.Metadata = setMetadataPath(workflow.Metadata, strings.TrimPrefix(op.Path, "metadata."), value)
		return workflow, nil
	}

	stmt := findStatementByID(&workflow.Body, op.TargetNodeID)
	if stmt == nil {
		return workflow, []diagnostic.Diagnostic{notFoundDiagnostic(op.TargetNodeID)}
	}
	stmt.Metadata = setMetadataPath(stmt.Metadata, strings.TrimPrefix(op.Path, "metadata."), value)
	return workflow, nil
}

func findStatementByID(stmt *ast.Statement, id string) *ast.Statement {
	if stmt == nil || id == "" {
		return nil
	}
	if stmt.ID == id {
		return stmt
	}
	for i := range stmt.Statements {
		if found := findStatementByID(&stmt.Statements[i], id); found != nil {
			return found
		}
	}
	for i := range stmt.Then {
		if found := findStatementByID(&stmt.Then[i], id); found != nil {
			return found
		}
	}
	for i := range stmt.Else {
		if found := findStatementByID(&stmt.Else[i], id); found != nil {
			return found
		}
	}
	for i := range stmt.Branches {
		for j := range stmt.Branches[i].Body {
			if found := findStatementByID(&stmt.Branches[i].Body[j], id); found != nil {
				return found
			}
		}
	}
	for i := range stmt.Catches {
		for j := range stmt.Catches[i].Body {
			if found := findStatementByID(&stmt.Catches[i].Body[j], id); found != nil {
				return found
			}
		}
	}
	for i := range stmt.Finally {
		if found := findStatementByID(&stmt.Finally[i], id); found != nil {
			return found
		}
	}
	return nil
}

func ensureStatementUIMetadata(stmt *ast.Statement) map[string]any {
	if stmt.Metadata == nil {
		stmt.Metadata = make(map[string]any)
	}
	ui, ok := stmt.Metadata["ui"].(map[string]any)
	if !ok {
		ui = make(map[string]any)
		stmt.Metadata["ui"] = ui
	}
	return ui
}

func setMetadataPath(metadata map[string]any, path string, value any) map[string]any {
	if metadata == nil {
		metadata = make(map[string]any)
	}
	parts := strings.Split(path, ".")
	current := metadata
	for _, part := range parts[:len(parts)-1] {
		next, ok := current[part].(map[string]any)
		if !ok {
			next = make(map[string]any)
			current[part] = next
		}
		current = next
	}
	current[parts[len(parts)-1]] = value
	return metadata
}

func notFoundDiagnostic(id string) diagnostic.Diagnostic {
	return diagnostic.Diagnostic{
		Code:     "EDIT_TARGET_NOT_FOUND",
		Severity: diagnostic.SeverityError,
		Message:  fmt.Sprintf("edit target %q was not found", id),
		Path:     "$.targetNodeId",
	}
}
