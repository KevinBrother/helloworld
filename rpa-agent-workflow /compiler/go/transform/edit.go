package transform

import (
	"encoding/json"
	"fmt"
	"strconv"
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
	value, ok := op.Payload["value"]
	if !ok {
		return workflow, []diagnostic.Diagnostic{{
			Code:     "MISSING_EDIT_VALUE",
			Severity: diagnostic.SeverityError,
			Message:  "updateField payload requires value",
			Path:     "$.payload.value",
		}}
	}

	if strings.HasPrefix(op.Path, "$.body") {
		return applyASTPathUpdate(workflow, op, value)
	}
	if !strings.HasPrefix(op.Path, "metadata.") {
		return workflow, []diagnostic.Diagnostic{unsafeEditPathDiagnostic("updateField path is not editable")}
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

func applyASTPathUpdate(workflow ast.Workflow, op editoperation.Document, value any) (ast.Workflow, []diagnostic.Diagnostic) {
	stmt, fieldPath, ok := statementAndFieldForPath(&workflow.Body, op.Path)
	if !ok || fieldPath == "" {
		return workflow, []diagnostic.Diagnostic{unsafeEditPathDiagnostic("updateField path does not point to an editable statement field")}
	}
	if op.TargetNodeID != "" && stmt.ID != op.TargetNodeID {
		return workflow, []diagnostic.Diagnostic{unsafeEditPathDiagnostic("updateField targetNodeId does not match path")}
	}
	if diag := setEditableStatementField(stmt, fieldPath, value); diag != nil {
		return workflow, []diagnostic.Diagnostic{*diag}
	}
	return workflow, nil
}

func statementAndFieldForPath(root *ast.Statement, path string) (*ast.Statement, string, bool) {
	if root == nil || path != "$.body" && !strings.HasPrefix(path, "$.body.") {
		return nil, "", false
	}
	stmt := root
	rest := strings.TrimPrefix(path, "$.body")
	for {
		if idx, next, ok := consumeIndexedSegment(rest, "statements"); ok {
			if idx < 0 || idx >= len(stmt.Statements) {
				return nil, "", false
			}
			stmt = &stmt.Statements[idx]
			rest = next
			continue
		}
		if idx, next, ok := consumeIndexedSegment(rest, "then"); ok {
			if idx < 0 || idx >= len(stmt.Then) {
				return nil, "", false
			}
			stmt = &stmt.Then[idx]
			rest = next
			continue
		}
		if idx, next, ok := consumeIndexedSegment(rest, "else"); ok {
			if idx < 0 || idx >= len(stmt.Else) {
				return nil, "", false
			}
			stmt = &stmt.Else[idx]
			rest = next
			continue
		}
		if idx, next, ok := consumeIndexedSegment(rest, "finally"); ok {
			if idx < 0 || idx >= len(stmt.Finally) {
				return nil, "", false
			}
			stmt = &stmt.Finally[idx]
			rest = next
			continue
		}
		if branchIdx, afterBranch, ok := consumeIndexedSegment(rest, "branches"); ok {
			bodyIdx, next, bodyOK := consumeIndexedSegment(afterBranch, "body")
			if !bodyOK || branchIdx < 0 || branchIdx >= len(stmt.Branches) || bodyIdx < 0 || bodyIdx >= len(stmt.Branches[branchIdx].Body) {
				return nil, "", false
			}
			stmt = &stmt.Branches[branchIdx].Body[bodyIdx]
			rest = next
			continue
		}
		if catchIdx, afterCatch, ok := consumeIndexedSegment(rest, "catches"); ok {
			bodyIdx, next, bodyOK := consumeIndexedSegment(afterCatch, "body")
			if !bodyOK || catchIdx < 0 || catchIdx >= len(stmt.Catches) || bodyIdx < 0 || bodyIdx >= len(stmt.Catches[catchIdx].Body) {
				return nil, "", false
			}
			stmt = &stmt.Catches[catchIdx].Body[bodyIdx]
			rest = next
			continue
		}
		if rest == "" {
			return stmt, "", true
		}
		if strings.HasPrefix(rest, ".") {
			return stmt, strings.TrimPrefix(rest, "."), true
		}
		return nil, "", false
	}
}

func consumeIndexedSegment(path string, name string) (int, string, bool) {
	prefix := "." + name + "["
	if !strings.HasPrefix(path, prefix) {
		return 0, path, false
	}
	end := strings.Index(path[len(prefix):], "]")
	if end < 0 {
		return 0, path, false
	}
	raw := path[len(prefix) : len(prefix)+end]
	idx, err := strconv.Atoi(raw)
	if err != nil {
		return 0, path, false
	}
	return idx, path[len(prefix)+end+1:], true
}

func setEditableStatementField(stmt *ast.Statement, fieldPath string, value any) *diagnostic.Diagnostic {
	switch {
	case strings.HasPrefix(fieldPath, "inputs."):
		name := strings.TrimPrefix(fieldPath, "inputs.")
		return setExpressionMapField(&stmt.Inputs, name, value)
	case strings.HasPrefix(fieldPath, "outputs."):
		name := strings.TrimPrefix(fieldPath, "outputs.")
		return setExpressionMapField(&stmt.Outputs, name, value)
	case strings.HasPrefix(fieldPath, "returns."):
		name := strings.TrimPrefix(fieldPath, "returns.")
		return setExpressionMapField(&stmt.Returns, name, value)
	case fieldPath == "value":
		return setExpressionPointer(&stmt.Value, value)
	case fieldPath == "condition":
		return setExpressionPointer(&stmt.Condition, value)
	case fieldPath == "iterable":
		return setExpressionPointer(&stmt.Iterable, value)
	default:
		diag := unsafeEditPathDiagnostic("statement field is not editable")
		return &diag
	}
}

func setExpressionMapField(target *map[string]ast.Expression, name string, value any) *diagnostic.Diagnostic {
	if name == "" || strings.Contains(name, ".") {
		diag := unsafeEditPathDiagnostic("expression map path must include exactly one field name")
		return &diag
	}
	expr, diag := decodeExpression(value)
	if diag != nil {
		return diag
	}
	if *target == nil {
		*target = make(map[string]ast.Expression)
	}
	(*target)[name] = expr
	return nil
}

func setExpressionPointer(target **ast.Expression, value any) *diagnostic.Diagnostic {
	expr, diag := decodeExpression(value)
	if diag != nil {
		return diag
	}
	*target = &expr
	return nil
}

func decodeExpression(value any) (ast.Expression, *diagnostic.Diagnostic) {
	data, err := json.Marshal(value)
	if err != nil {
		diag := diagnostic.Diagnostic{
			Code:     "INVALID_EDIT_VALUE",
			Severity: diagnostic.SeverityError,
			Message:  fmt.Sprintf("edit value cannot be encoded as expression: %v", err),
			Path:     "$.payload.value",
		}
		return ast.Expression{}, &diag
	}
	var expr ast.Expression
	if err := json.Unmarshal(data, &expr); err != nil || expr.Kind == "" {
		message := "edit value must be an AST expression"
		if err != nil {
			message = fmt.Sprintf("%s: %v", message, err)
		}
		diag := diagnostic.Diagnostic{
			Code:     "INVALID_EDIT_VALUE",
			Severity: diagnostic.SeverityError,
			Message:  message,
			Path:     "$.payload.value",
		}
		return ast.Expression{}, &diag
	}
	return expr, nil
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

func unsafeEditPathDiagnostic(message string) diagnostic.Diagnostic {
	return diagnostic.Diagnostic{
		Code:     "UNSAFE_EDIT_PATH",
		Severity: diagnostic.SeverityError,
		Message:  message,
		Path:     "$.path",
	}
}

func notFoundDiagnostic(id string) diagnostic.Diagnostic {
	return diagnostic.Diagnostic{
		Code:     "EDIT_TARGET_NOT_FOUND",
		Severity: diagnostic.SeverityError,
		Message:  fmt.Sprintf("edit target %q was not found", id),
		Path:     "$.targetNodeId",
	}
}
