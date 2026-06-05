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
	case editoperation.OperationTypeInsertNode:
		return applyInsertNode(workflow, op)
	case editoperation.OperationTypeDeleteNode:
		return applyDeleteNode(workflow, op)
	default:
		return workflow, []diagnostic.Diagnostic{{
			Code:     "UNSUPPORTED_EDIT_OPERATION",
			Severity: diagnostic.SeverityError,
			Message:  fmt.Sprintf("unsupported edit operation %q", op.Type),
			Path:     "$.type",
		}}
	}
}

func applyDeleteNode(workflow ast.Workflow, op editoperation.Document) (ast.Workflow, []diagnostic.Diagnostic) {
	nodeID, _ := op.Payload["nodeId"].(string)
	if nodeID == "" {
		return workflow, []diagnostic.Diagnostic{editPayloadDiagnostic("INVALID_DELETE_PAYLOAD", "deleteNode payload requires nodeId", "$.payload.nodeId")}
	}
	if op.TargetNodeID != "" && op.TargetNodeID != nodeID {
		return workflow, []diagnostic.Diagnostic{editPayloadDiagnostic("DELETE_TARGET_MISMATCH", "deleteNode targetNodeId must match payload nodeId", "$.targetNodeId")}
	}
	if nodeID == workflow.Body.ID {
		return workflow, []diagnostic.Diagnostic{editPayloadDiagnostic("DELETE_NODE_PROTECTED", "workflow root node cannot be deleted", "$.payload.nodeId")}
	}

	deleted, protected := deleteStatementByID(&workflow.Body, nodeID)
	if protected {
		return workflow, []diagnostic.Diagnostic{editPayloadDiagnostic("DELETE_NODE_PROTECTED", fmt.Sprintf("node %q cannot be deleted", nodeID), "$.payload.nodeId")}
	}
	if !deleted {
		return workflow, []diagnostic.Diagnostic{editPayloadDiagnostic("DELETE_NODE_NOT_FOUND", fmt.Sprintf("delete target %q was not found", nodeID), "$.payload.nodeId")}
	}
	return workflow, nil
}

func deleteStatementByID(stmt *ast.Statement, nodeID string) (bool, bool) {
	if stmt == nil {
		return false, false
	}
	if deleted, protected := deleteStatementFromList(&stmt.Statements, nodeID); deleted || protected {
		return deleted, protected
	}
	if deleted, protected := deleteStatementFromList(&stmt.Then, nodeID); deleted || protected {
		return deleted, protected
	}
	if deleted, protected := deleteStatementFromList(&stmt.Else, nodeID); deleted || protected {
		return deleted, protected
	}
	for i := range stmt.Branches {
		if deleted, protected := deleteStatementFromList(&stmt.Branches[i].Body, nodeID); deleted || protected {
			return deleted, protected
		}
	}
	for i := range stmt.Catches {
		if deleted, protected := deleteStatementFromList(&stmt.Catches[i].Body, nodeID); deleted || protected {
			return deleted, protected
		}
	}
	if deleted, protected := deleteStatementFromList(&stmt.Finally, nodeID); deleted || protected {
		return deleted, protected
	}

	for i := range stmt.Statements {
		if deleted, protected := deleteStatementByID(&stmt.Statements[i], nodeID); deleted || protected {
			return deleted, protected
		}
	}
	for i := range stmt.Then {
		if deleted, protected := deleteStatementByID(&stmt.Then[i], nodeID); deleted || protected {
			return deleted, protected
		}
	}
	for i := range stmt.Else {
		if deleted, protected := deleteStatementByID(&stmt.Else[i], nodeID); deleted || protected {
			return deleted, protected
		}
	}
	for i := range stmt.Branches {
		for j := range stmt.Branches[i].Body {
			if deleted, protected := deleteStatementByID(&stmt.Branches[i].Body[j], nodeID); deleted || protected {
				return deleted, protected
			}
		}
	}
	for i := range stmt.Catches {
		for j := range stmt.Catches[i].Body {
			if deleted, protected := deleteStatementByID(&stmt.Catches[i].Body[j], nodeID); deleted || protected {
				return deleted, protected
			}
		}
	}
	for i := range stmt.Finally {
		if deleted, protected := deleteStatementByID(&stmt.Finally[i], nodeID); deleted || protected {
			return deleted, protected
		}
	}
	return false, false
}

func deleteStatementFromList(stmts *[]ast.Statement, nodeID string) (bool, bool) {
	list := *stmts
	for i, stmt := range list {
		if stmt.ID != nodeID {
			continue
		}
		if stmt.Kind == "return" {
			return false, true
		}
		copy(list[i:], list[i+1:])
		list = list[:len(list)-1]
		*stmts = list
		return true, false
	}
	return false, false
}

func applyInsertNode(workflow ast.Workflow, op editoperation.Document) (ast.Workflow, []diagnostic.Diagnostic) {
	anchor, ok := op.Payload["anchor"].(map[string]any)
	if !ok {
		return workflow, []diagnostic.Diagnostic{editPayloadDiagnostic("INVALID_INSERT_PAYLOAD", "insertNode payload requires anchor", "$.payload.anchor")}
	}
	node, ok := op.Payload["node"].(map[string]any)
	if !ok {
		return workflow, []diagnostic.Diagnostic{editPayloadDiagnostic("INVALID_INSERT_PAYLOAD", "insertNode payload requires node", "$.payload.node")}
	}

	afterNodeID, _ := anchor["afterNodeId"].(string)
	beforeNodeID, _ := anchor["beforeNodeId"].(string)
	if afterNodeID == "" || beforeNodeID == "" {
		return workflow, []diagnostic.Diagnostic{editPayloadDiagnostic("INVALID_INSERT_PAYLOAD", "insertNode anchor requires afterNodeId and beforeNodeId", "$.payload.anchor")}
	}

	stmt, diag := buildInsertedStatement(workflow, node)
	if diag != nil {
		return workflow, []diagnostic.Diagnostic{*diag}
	}
	inserted, foundPair := insertBetween(&workflow.Body, afterNodeID, beforeNodeID, stmt)
	if inserted {
		return workflow, nil
	}
	code := "INSERT_ANCHOR_NOT_FOUND"
	message := fmt.Sprintf("insert anchor %q -> %q was not found", afterNodeID, beforeNodeID)
	if foundPair {
		code = "INSERT_ANCHOR_NOT_ADJACENT"
		message = fmt.Sprintf("insert anchor %q -> %q is not adjacent", afterNodeID, beforeNodeID)
	}
	return workflow, []diagnostic.Diagnostic{editPayloadDiagnostic(code, message, "$.payload.anchor")}
}

func buildInsertedStatement(workflow ast.Workflow, node map[string]any) (ast.Statement, *diagnostic.Diagnostic) {
	kind, _ := node["kind"].(string)
	switch kind {
	case "callBlock":
		blockID, _ := node["block"].(string)
		if blockID == "" {
			diag := editPayloadDiagnostic("INVALID_INSERT_PAYLOAD", "callBlock insert requires block", "$.payload.node.block")
			return ast.Statement{}, &diag
		}
		inputs, diag := decodeExpressionMapFromValue(node["inputs"], "$.payload.node.inputs")
		if diag != nil {
			return ast.Statement{}, diag
		}
		return ast.Statement{
			ID:     uniqueStatementID(workflow, slugStatementID(blockID)),
			Kind:   "callBlock",
			Block:  blockID,
			Inputs: inputs,
		}, nil
	case "if":
		return ast.Statement{
			ID:        uniqueStatementID(workflow, "if_node"),
			Kind:      "if",
			Condition: &ast.Expression{Kind: "literal", Value: true},
			Then:      []ast.Statement{},
			Else:      []ast.Statement{},
		}, nil
	case "parallel":
		branchCount := insertBranchCount(node)
		branches := make([]ast.Branch, branchCount)
		for i := range branches {
			branches[i] = ast.Branch{ID: fmt.Sprintf("branch_%d", i+1), Body: []ast.Statement{}}
		}
		return ast.Statement{
			ID:       uniqueStatementID(workflow, "parallel_node"),
			Kind:     "parallel",
			Branches: branches,
		}, nil
	default:
		diag := editPayloadDiagnostic("UNSUPPORTED_INSERT_NODE_KIND", fmt.Sprintf("unsupported insert node kind %q", kind), "$.payload.node.kind")
		return ast.Statement{}, &diag
	}
}

func decodeExpressionMapFromValue(value any, path string) (map[string]ast.Expression, *diagnostic.Diagnostic) {
	if value == nil {
		return map[string]ast.Expression{}, nil
	}
	data, err := json.Marshal(value)
	if err != nil {
		diag := editPayloadDiagnostic("INVALID_INSERT_PAYLOAD", fmt.Sprintf("expression map cannot be encoded: %v", err), path)
		return nil, &diag
	}
	var decoded map[string]ast.Expression
	if err := json.Unmarshal(data, &decoded); err != nil {
		diag := editPayloadDiagnostic("INVALID_INSERT_PAYLOAD", fmt.Sprintf("expression map is invalid: %v", err), path)
		return nil, &diag
	}
	for name, expr := range decoded {
		if expr.Kind == "" {
			diag := editPayloadDiagnostic("INVALID_INSERT_PAYLOAD", fmt.Sprintf("input %q must be an expression", name), path+"."+name)
			return nil, &diag
		}
	}
	return decoded, nil
}

func insertBranchCount(node map[string]any) int {
	count := 2
	switch value := node["branchCount"].(type) {
	case int:
		count = value
	case int64:
		count = int(value)
	case float64:
		count = int(value)
	}
	if count < 2 {
		return 2
	}
	return count
}

func insertBetween(stmt *ast.Statement, afterNodeID string, beforeNodeID string, inserted ast.Statement) (bool, bool) {
	if stmt == nil {
		return false, false
	}
	if stmt.ID == afterNodeID {
		if ok, foundPair := insertAtStartOfList(&stmt.Statements, beforeNodeID, inserted); ok || foundPair {
			return ok, foundPair
		}
		if ok, foundPair := insertAtStartOfList(&stmt.Then, beforeNodeID, inserted); ok || foundPair {
			return ok, foundPair
		}
		if ok, foundPair := insertAtStartOfList(&stmt.Else, beforeNodeID, inserted); ok || foundPair {
			return ok, foundPair
		}
		for i := range stmt.Branches {
			if ok, foundPair := insertAtStartOfList(&stmt.Branches[i].Body, beforeNodeID, inserted); ok || foundPair {
				return ok, foundPair
			}
		}
		for i := range stmt.Catches {
			if ok, foundPair := insertAtStartOfList(&stmt.Catches[i].Body, beforeNodeID, inserted); ok || foundPair {
				return ok, foundPair
			}
		}
		if ok, foundPair := insertAtStartOfList(&stmt.Finally, beforeNodeID, inserted); ok || foundPair {
			return ok, foundPair
		}
	}
	if ok, foundPair := insertBetweenInList(&stmt.Statements, afterNodeID, beforeNodeID, inserted); ok || foundPair {
		return ok, foundPair
	}
	if ok, foundPair := insertBetweenInList(&stmt.Then, afterNodeID, beforeNodeID, inserted); ok || foundPair {
		return ok, foundPair
	}
	if ok, foundPair := insertBetweenInList(&stmt.Else, afterNodeID, beforeNodeID, inserted); ok || foundPair {
		return ok, foundPair
	}
	for i := range stmt.Branches {
		if ok, foundPair := insertBetweenInList(&stmt.Branches[i].Body, afterNodeID, beforeNodeID, inserted); ok || foundPair {
			return ok, foundPair
		}
	}
	for i := range stmt.Catches {
		if ok, foundPair := insertBetweenInList(&stmt.Catches[i].Body, afterNodeID, beforeNodeID, inserted); ok || foundPair {
			return ok, foundPair
		}
	}
	if ok, foundPair := insertBetweenInList(&stmt.Finally, afterNodeID, beforeNodeID, inserted); ok || foundPair {
		return ok, foundPair
	}

	foundAny := false
	for i := range stmt.Statements {
		ok, foundPair := insertBetween(&stmt.Statements[i], afterNodeID, beforeNodeID, inserted)
		if ok {
			return true, true
		}
		foundAny = foundAny || foundPair
	}
	for i := range stmt.Then {
		ok, foundPair := insertBetween(&stmt.Then[i], afterNodeID, beforeNodeID, inserted)
		if ok {
			return true, true
		}
		foundAny = foundAny || foundPair
	}
	for i := range stmt.Else {
		ok, foundPair := insertBetween(&stmt.Else[i], afterNodeID, beforeNodeID, inserted)
		if ok {
			return true, true
		}
		foundAny = foundAny || foundPair
	}
	for i := range stmt.Branches {
		for j := range stmt.Branches[i].Body {
			ok, foundPair := insertBetween(&stmt.Branches[i].Body[j], afterNodeID, beforeNodeID, inserted)
			if ok {
				return true, true
			}
			foundAny = foundAny || foundPair
		}
	}
	for i := range stmt.Catches {
		for j := range stmt.Catches[i].Body {
			ok, foundPair := insertBetween(&stmt.Catches[i].Body[j], afterNodeID, beforeNodeID, inserted)
			if ok {
				return true, true
			}
			foundAny = foundAny || foundPair
		}
	}
	for i := range stmt.Finally {
		ok, foundPair := insertBetween(&stmt.Finally[i], afterNodeID, beforeNodeID, inserted)
		if ok {
			return true, true
		}
		foundAny = foundAny || foundPair
	}
	return false, foundAny
}

func insertAtStartOfList(stmts *[]ast.Statement, beforeNodeID string, inserted ast.Statement) (bool, bool) {
	list := *stmts
	if len(list) == 0 {
		return false, false
	}
	if list[0].ID != beforeNodeID {
		for _, stmt := range list {
			if stmt.ID == beforeNodeID {
				return false, true
			}
		}
		return false, false
	}
	list = append([]ast.Statement{inserted}, list...)
	*stmts = list
	return true, true
}

func insertBetweenInList(stmts *[]ast.Statement, afterNodeID string, beforeNodeID string, inserted ast.Statement) (bool, bool) {
	list := *stmts
	afterIndex := -1
	beforeIndex := -1
	for i, stmt := range list {
		if stmt.ID == afterNodeID {
			afterIndex = i
		}
		if stmt.ID == beforeNodeID {
			beforeIndex = i
		}
	}
	if afterIndex < 0 || beforeIndex < 0 {
		return false, false
	}
	if beforeIndex != afterIndex+1 {
		return false, true
	}
	list = append(list, ast.Statement{})
	copy(list[afterIndex+2:], list[afterIndex+1:])
	list[afterIndex+1] = inserted
	*stmts = list
	return true, true
}

func uniqueStatementID(workflow ast.Workflow, base string) string {
	if base == "" {
		base = "node"
	}
	if findStatementByID(&workflow.Body, base) == nil {
		return base
	}
	for i := 2; ; i++ {
		candidate := fmt.Sprintf("%s_%d", base, i)
		if findStatementByID(&workflow.Body, candidate) == nil {
			return candidate
		}
	}
}

func slugStatementID(value string) string {
	value = strings.ToLower(value)
	var b strings.Builder
	lastUnderscore := false
	for _, r := range value {
		if r >= 'a' && r <= 'z' || r >= '0' && r <= '9' {
			b.WriteRune(r)
			lastUnderscore = false
			continue
		}
		if !lastUnderscore {
			b.WriteByte('_')
			lastUnderscore = true
		}
	}
	return strings.Trim(b.String(), "_")
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
	if op.Path == "$.inputs" {
		return applyWorkflowInputsUpdate(workflow, value)
	}
	if op.Path == "$.outputs" {
		return applyWorkflowOutputsUpdate(workflow, op, value)
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

func applyWorkflowInputsUpdate(workflow ast.Workflow, value any) (ast.Workflow, []diagnostic.Diagnostic) {
	ports, diag := decodePorts(value, "$.payload.value")
	if diag != nil {
		return workflow, []diagnostic.Diagnostic{*diag}
	}
	renames := portRenamesByPosition(workflow.Inputs, ports, "input.")
	workflow.Inputs = ports
	if len(renames) > 0 {
		rewriteStatementRefs(&workflow.Body, renames)
		for i := range workflow.Workflows {
			rewriteStatementRefs(&workflow.Workflows[i].Body, renames)
		}
	}
	return workflow, nil
}

func applyWorkflowOutputsUpdate(workflow ast.Workflow, op editoperation.Document, value any) (ast.Workflow, []diagnostic.Diagnostic) {
	ports, diag := decodePorts(value, "$.payload.value")
	if diag != nil {
		return workflow, []diagnostic.Diagnostic{*diag}
	}
	oldPorts := workflow.Outputs
	workflow.Outputs = ports

	if op.TargetNodeID == "" || op.TargetNodeID == workflow.Body.ID {
		syncReturnMapsByOutputPorts(&workflow.Body, oldPorts, ports, nil)
		return workflow, nil
	}

	stmt := findStatementByID(&workflow.Body, op.TargetNodeID)
	if stmt == nil {
		return workflow, []diagnostic.Diagnostic{notFoundDiagnostic(op.TargetNodeID)}
	}
	if stmt.Kind != "return" {
		return workflow, []diagnostic.Diagnostic{unsafeEditPathDiagnostic("workflow outputs target must be a return node")}
	}
	syncReturnMap(stmt, oldPorts, ports)
	return workflow, nil
}

func decodePorts(value any, path string) ([]ast.Port, *diagnostic.Diagnostic) {
	data, err := json.Marshal(value)
	if err != nil {
		diag := editPayloadDiagnostic("INVALID_PORTS_VALUE", fmt.Sprintf("ports value cannot be encoded: %v", err), path)
		return nil, &diag
	}
	var ports []ast.Port
	if err := json.Unmarshal(data, &ports); err != nil {
		diag := editPayloadDiagnostic("INVALID_PORTS_VALUE", fmt.Sprintf("ports value must be an array of ports: %v", err), path)
		return nil, &diag
	}
	return ports, nil
}

func portRenamesByPosition(oldPorts []ast.Port, newPorts []ast.Port, prefix string) map[string]string {
	renames := map[string]string{}
	for i := range oldPorts {
		if i >= len(newPorts) {
			continue
		}
		oldName := oldPorts[i].Name
		newName := newPorts[i].Name
		if oldName != "" && newName != "" && oldName != newName {
			renames[prefix+oldName] = prefix + newName
		}
	}
	return renames
}

func rewriteStatementRefs(stmt *ast.Statement, renames map[string]string) {
	if stmt == nil {
		return
	}
	rewriteExpressionMapRefs(stmt.Inputs, renames)
	rewriteExpressionMapRefs(stmt.Outputs, renames)
	rewriteExpressionMapRefs(stmt.Returns, renames)
	if stmt.Value != nil {
		rewriteExpressionRefs(stmt.Value, renames)
	}
	if stmt.Condition != nil {
		rewriteExpressionRefs(stmt.Condition, renames)
	}
	if stmt.Iterable != nil {
		rewriteExpressionRefs(stmt.Iterable, renames)
	}
	for i := range stmt.Statements {
		rewriteStatementRefs(&stmt.Statements[i], renames)
	}
	for i := range stmt.Then {
		rewriteStatementRefs(&stmt.Then[i], renames)
	}
	for i := range stmt.Else {
		rewriteStatementRefs(&stmt.Else[i], renames)
	}
	for i := range stmt.Branches {
		for j := range stmt.Branches[i].Body {
			rewriteStatementRefs(&stmt.Branches[i].Body[j], renames)
		}
	}
	for i := range stmt.Catches {
		for j := range stmt.Catches[i].Body {
			rewriteStatementRefs(&stmt.Catches[i].Body[j], renames)
		}
	}
	for i := range stmt.Finally {
		rewriteStatementRefs(&stmt.Finally[i], renames)
	}
}

func rewriteExpressionMapRefs(expressions map[string]ast.Expression, renames map[string]string) {
	for key, expr := range expressions {
		rewriteExpressionRefs(&expr, renames)
		expressions[key] = expr
	}
}

func rewriteExpressionRefs(expr *ast.Expression, renames map[string]string) {
	if expr == nil {
		return
	}
	if expr.Kind == "ref" {
		if next, ok := renames[expr.Ref]; ok {
			expr.Ref = next
		}
	}
	if expr.Operator != nil {
		rewriteExpressionRefs(expr.Operator, renames)
	}
	if expr.Left != nil {
		rewriteExpressionRefs(expr.Left, renames)
	}
	if expr.Right != nil {
		rewriteExpressionRefs(expr.Right, renames)
	}
	for i := range expr.Args {
		rewriteExpressionRefs(&expr.Args[i], renames)
	}
	for i := range expr.Items {
		rewriteExpressionRefs(&expr.Items[i], renames)
	}
	for key, field := range expr.Fields {
		rewriteExpressionRefs(&field, renames)
		expr.Fields[key] = field
	}
}

func syncReturnMapsByOutputPorts(stmt *ast.Statement, oldPorts []ast.Port, newPorts []ast.Port, onlyID *string) {
	if stmt == nil {
		return
	}
	if stmt.Kind == "return" && (onlyID == nil || stmt.ID == *onlyID) {
		syncReturnMap(stmt, oldPorts, newPorts)
	}
	for i := range stmt.Statements {
		syncReturnMapsByOutputPorts(&stmt.Statements[i], oldPorts, newPorts, onlyID)
	}
	for i := range stmt.Then {
		syncReturnMapsByOutputPorts(&stmt.Then[i], oldPorts, newPorts, onlyID)
	}
	for i := range stmt.Else {
		syncReturnMapsByOutputPorts(&stmt.Else[i], oldPorts, newPorts, onlyID)
	}
	for i := range stmt.Branches {
		for j := range stmt.Branches[i].Body {
			syncReturnMapsByOutputPorts(&stmt.Branches[i].Body[j], oldPorts, newPorts, onlyID)
		}
	}
	for i := range stmt.Catches {
		for j := range stmt.Catches[i].Body {
			syncReturnMapsByOutputPorts(&stmt.Catches[i].Body[j], oldPorts, newPorts, onlyID)
		}
	}
	for i := range stmt.Finally {
		syncReturnMapsByOutputPorts(&stmt.Finally[i], oldPorts, newPorts, onlyID)
	}
}

func syncReturnMap(stmt *ast.Statement, oldPorts []ast.Port, newPorts []ast.Port) {
	next := make(map[string]ast.Expression, len(newPorts))
	for i, port := range newPorts {
		if existing, ok := stmt.Returns[port.Name]; ok {
			next[port.Name] = existing
			continue
		}
		if i < len(oldPorts) {
			if existing, ok := stmt.Returns[oldPorts[i].Name]; ok {
				next[port.Name] = existing
				continue
			}
		}
		next[port.Name] = defaultExpressionForType(port.Type)
	}
	stmt.Returns = next
}

func defaultExpressionForType(typ ast.Type) ast.Expression {
	switch typ.Name {
	case "number", "integer":
		return ast.Expression{Kind: "literal", Value: float64(0)}
	case "boolean":
		return ast.Expression{Kind: "literal", Value: false}
	case "object":
		return ast.Expression{Kind: "literal", Value: map[string]any{}}
	case "array":
		return ast.Expression{Kind: "literal", Value: []any{}}
	default:
		return ast.Expression{Kind: "literal", Value: ""}
	}
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
	case fieldPath == "condition.operator":
		return setConditionOperator(stmt, value)
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

func setConditionOperator(stmt *ast.Statement, value any) *diagnostic.Diagnostic {
	if stmt.Condition == nil {
		diag := unsafeEditPathDiagnostic("condition operator requires an existing condition")
		return &diag
	}
	expr, diag := decodeExpression(value)
	if diag != nil {
		return diag
	}
	stmt.Condition.Operator = &expr
	if expr.Kind == "literal" {
		if operator, ok := expr.Value.(string); ok {
			stmt.Condition.Op = operator
		}
	}
	return nil
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

func editPayloadDiagnostic(code string, message string, path string) diagnostic.Diagnostic {
	return diagnostic.Diagnostic{
		Code:     code,
		Severity: diagnostic.SeverityError,
		Message:  message,
		Path:     path,
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
