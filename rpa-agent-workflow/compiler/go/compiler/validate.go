package compiler

import (
	"encoding/json"
	"fmt"
	"strings"

	"rpa-agent-workflow/compiler/go/diagnostic"
	"rpa-agent-workflow/compiler/go/schema"
	"rpa-agent-workflow/contracts/ast"
	"rpa-agent-workflow/contracts/block"
)

func ValidateWorkflow(data []byte, blocks map[string]block.Definition) (*ast.Workflow, []diagnostic.Diagnostic) {
	if err := schema.ValidateAstBytes(data); err != nil {
		return nil, []diagnostic.Diagnostic{diagnosticError("SCHEMA_INVALID", err.Error(), "$")}
	}

	var workflow ast.Workflow
	if err := json.Unmarshal(data, &workflow); err != nil {
		return nil, []diagnostic.Diagnostic{diagnosticError("JSON_SYNTAX", err.Error(), "$")}
	}

	var diags []diagnostic.Diagnostic
	if len(workflow.Variables) > 0 {
		diags = append(diags, diagnosticError("ORDINARY_VARIABLES_UNSUPPORTED", "ordinary workflow variables are unsupported; use input.*, node.*, loop.*, or state.*", "$.variables"))
	}
	for name, declaration := range workflow.State {
		if declaration.InitialValue != nil {
			diags = append(diags, validateExpression(declaration.InitialValue, workflow, blocks, "$.state."+name+".initialValue")...)
		}
	}
	diags = append(diags, validateUniqueStatementIDs(workflow.Body, "$.body")...)
	for i, sub := range workflow.Workflows {
		diags = append(diags, validateUniqueStatementIDs(sub.Body, fmt.Sprintf("$.workflows[%d].body", i))...)
	}
	diags = append(diags, validateStatement(workflow.Body, workflow, blocks, "$.body")...)
	return &workflow, diags
}

func validateUniqueStatementIDs(root ast.Statement, path string) []diagnostic.Diagnostic {
	seen := make(map[string]string)
	var diags []diagnostic.Diagnostic
	collectStatementIDs(root, path, seen, &diags)
	return diags
}

func collectStatementIDs(stmt ast.Statement, path string, seen map[string]string, diags *[]diagnostic.Diagnostic) {
	if stmt.ID != "" {
		if firstPath, ok := seen[stmt.ID]; ok {
			*diags = append(*diags, diagnosticError(
				"DUPLICATE_STATEMENT_ID",
				fmt.Sprintf("duplicate statement id %q, first seen at %s", stmt.ID, firstPath+".id"),
				path+".id",
			))
		} else {
			seen[stmt.ID] = path
		}
	}
	for i, child := range stmt.Statements {
		collectStatementIDs(child, fmt.Sprintf("%s.statements[%d]", path, i), seen, diags)
	}
	for i, child := range stmt.Then {
		collectStatementIDs(child, fmt.Sprintf("%s.then[%d]", path, i), seen, diags)
	}
	for i, child := range stmt.Else {
		collectStatementIDs(child, fmt.Sprintf("%s.else[%d]", path, i), seen, diags)
	}
	for i, branch := range stmt.Branches {
		for j, child := range branch.Body {
			collectStatementIDs(child, fmt.Sprintf("%s.branches[%d].body[%d]", path, i, j), seen, diags)
		}
	}
	for i, clause := range stmt.Catches {
		for j, child := range clause.Body {
			collectStatementIDs(child, fmt.Sprintf("%s.catches[%d].body[%d]", path, i, j), seen, diags)
		}
	}
	for i, child := range stmt.Finally {
		collectStatementIDs(child, fmt.Sprintf("%s.finally[%d]", path, i), seen, diags)
	}
}

func validateStatement(stmt ast.Statement, workflow ast.Workflow, blocks map[string]block.Definition, path string) []diagnostic.Diagnostic {
	var diags []diagnostic.Diagnostic
	switch stmt.Kind {
	case "sequence":
		for i, child := range stmt.Statements {
			diags = append(diags, validateStatement(child, workflow, blocks, fmt.Sprintf("%s.statements[%d]", path, i))...)
		}
	case "parallel":
		diags = append(diags, validateParallel(stmt, workflow, path)...)
		for i, branch := range stmt.Branches {
			for j, child := range branch.Body {
				diags = append(diags, validateStatement(child, workflow, blocks, fmt.Sprintf("%s.branches[%d].body[%d]", path, i, j))...)
			}
		}
	case "callBlock":
		diags = append(diags, validateCallBlock(stmt, workflow, blocks, path)...)
	case "assign":
		diags = append(diags, validateExpression(stmt.Value, workflow, blocks, path+".value")...)
		if !strings.HasPrefix(stmt.Target, "state.") {
			diags = append(diags, diagnosticError("ASSIGN_TARGET_MUST_BE_STATE", fmt.Sprintf("assign target %q must be state.*", stmt.Target), path+".target"))
		} else if !hasState(workflow, strings.TrimPrefix(stmt.Target, "state.")) {
			diags = append(diags, diagnosticError("UNKNOWN_STATE", fmt.Sprintf("unknown state %q", stmt.Target), path+".target"))
		}
	case "if":
		diags = append(diags, validateExpression(stmt.Condition, workflow, blocks, path+".condition")...)
		for i, child := range stmt.Then {
			diags = append(diags, validateStatement(child, workflow, blocks, fmt.Sprintf("%s.then[%d]", path, i))...)
		}
		for i, child := range stmt.Else {
			diags = append(diags, validateStatement(child, workflow, blocks, fmt.Sprintf("%s.else[%d]", path, i))...)
		}
	case "loop":
		if stmt.LoopKind == "foreach" {
			diags = append(diags, validateExpression(stmt.Iterable, workflow, blocks, path+".iterable")...)
		} else {
			diags = append(diags, validateExpression(stmt.Condition, workflow, blocks, path+".condition")...)
		}
		for i, child := range stmt.Statements {
			diags = append(diags, validateStatement(child, workflow, blocks, fmt.Sprintf("%s.statements[%d]", path, i))...)
		}
	case "try":
		for i, child := range stmt.Statements {
			diags = append(diags, validateStatement(child, workflow, blocks, fmt.Sprintf("%s.statements[%d]", path, i))...)
		}
		for i, clause := range stmt.Catches {
			for j, child := range clause.Body {
				diags = append(diags, validateStatement(child, workflow, blocks, fmt.Sprintf("%s.catches[%d].body[%d]", path, i, j))...)
			}
		}
		for i, child := range stmt.Finally {
			diags = append(diags, validateStatement(child, workflow, blocks, fmt.Sprintf("%s.finally[%d]", path, i))...)
		}
	case "callWorkflow":
		if !hasSubWorkflow(workflow, stmt.Workflow) {
			diags = append(diags, diagnosticError("UNKNOWN_WORKFLOW", fmt.Sprintf("unknown workflow %q", stmt.Workflow), path+".workflow"))
		}
		for key, expr := range stmt.Inputs {
			child := expr
			diags = append(diags, validateExpression(&child, workflow, blocks, path+".inputs."+key)...)
		}
	case "return":
		for key, expr := range stmt.Returns {
			child := expr
			diags = append(diags, validateExpression(&child, workflow, blocks, path+".returns."+key)...)
		}
	default:
		diags = append(diags, diagnosticError("UNSUPPORTED_STATEMENT", fmt.Sprintf("unsupported statement kind %q", stmt.Kind), path+".kind"))
	}
	return diags
}

func validateParallel(stmt ast.Statement, workflow ast.Workflow, path string) []diagnostic.Diagnostic {
	var writes = make(map[string]int)
	var diags []diagnostic.Diagnostic
	for i, branch := range stmt.Branches {
		for _, child := range branch.Body {
			if child.Kind == "assign" && child.Target != "" {
				writes[child.Target]++
				if writes[child.Target] > 1 {
					diags = append(diags, diagnosticError("PARALLEL_WRITE_CONFLICT", fmt.Sprintf("shared write to %q", child.Target), fmt.Sprintf("%s.branches[%d]", path, i)))
				}
			}
		}
	}
	return diags
}

func validateCallBlock(stmt ast.Statement, workflow ast.Workflow, blocks map[string]block.Definition, path string) []diagnostic.Diagnostic {
	blk, ok := blocks[stmt.Block]
	if !ok {
		return []diagnostic.Diagnostic{diagnosticError("UNKNOWN_BLOCK", fmt.Sprintf("unknown block %q", stmt.Block), path+".block")}
	}
	var diags []diagnostic.Diagnostic
	if blk.Runtime.Target != "python" {
		diags = append(diags, diagnosticError("UNSUPPORTED_RUNTIME_TARGET", fmt.Sprintf("unsupported runtime target %q", blk.Runtime.Target), path+".block"))
	}
	switch blk.Runtime.Mode {
	case "", "sync", "async", "generator":
	default:
		diags = append(diags, diagnosticError("UNSUPPORTED_RUNTIME_MODE", fmt.Sprintf("unsupported runtime mode %q", blk.Runtime.Mode), path+".block"))
	}
	knownInputs := make(map[string]bool, len(blk.Inputs))
	for _, port := range blk.Inputs {
		knownInputs[port.Name] = true
		expr, ok := stmt.Inputs[port.Name]
		if !ok {
			diags = append(diags, diagnosticError("MISSING_INPUT", fmt.Sprintf("missing input %q", port.Name), path+".inputs."+port.Name))
			continue
		}
		child := expr
		diags = append(diags, validateExpression(&child, workflow, blocks, path+".inputs."+port.Name)...)
		if lit, ok := literalType(&child); ok && !typeMatches(lit, port.Type.Name) {
			diags = append(diags, diagnosticError("TYPE_MISMATCH", fmt.Sprintf("expected %s", port.Type.Name), path+".inputs."+port.Name))
		}
	}
	for name := range stmt.Inputs {
		if !knownInputs[name] {
			diags = append(diags, diagnosticError("UNKNOWN_INPUT", fmt.Sprintf("unknown input %q", name), path+".inputs."+name))
		}
	}
	return diags
}

func validateExpression(expr *ast.Expression, workflow ast.Workflow, blocks map[string]block.Definition, path string) []diagnostic.Diagnostic {
	if expr == nil {
		return nil
	}
	switch expr.Kind {
	case "literal":
		return nil
	case "ref":
		if strings.HasPrefix(expr.Ref, "var.") {
			return []diagnostic.Diagnostic{diagnosticError("UNSUPPORTED_VARIABLE_REF", fmt.Sprintf("ordinary variable ref %q is unsupported", expr.Ref), path)}
		}
		if strings.HasPrefix(expr.Ref, "state.") && !hasState(workflow, strings.TrimPrefix(expr.Ref, "state.")) {
			return []diagnostic.Diagnostic{diagnosticError("UNKNOWN_STATE", fmt.Sprintf("unknown state %q", expr.Ref), path)}
		}
		return nil
	case "binary":
		var diags []diagnostic.Diagnostic
		diags = append(diags, validateExpression(expr.Operator, workflow, blocks, path+".operator")...)
		diags = append(diags, validateExpression(expr.Left, workflow, blocks, path+".left")...)
		diags = append(diags, validateExpression(expr.Right, workflow, blocks, path+".right")...)
		return diags
	case "array":
		var diags []diagnostic.Diagnostic
		for i, item := range expr.Items {
			diags = append(diags, validateExpression(&item, workflow, blocks, fmt.Sprintf("%s.items[%d]", path, i))...)
		}
		return diags
	case "object", "branch":
		var diags []diagnostic.Diagnostic
		for key, item := range expr.Fields {
			child := item
			diags = append(diags, validateExpression(&child, workflow, blocks, path+".fields."+key)...)
		}
		return diags
	default:
		return nil
	}
}

func literalType(expr *ast.Expression) (string, bool) {
	if expr == nil || expr.Kind != "literal" {
		return "", false
	}
	switch expr.Value.(type) {
	case string:
		return "string", true
	case float64:
		return "number", true
	case bool:
		return "boolean", true
	default:
		return "any", true
	}
}

func typeMatches(actual, expected string) bool {
	return expected == "any" || actual == expected
}

func hasVariable(workflow ast.Workflow, name string) bool {
	for _, variable := range workflow.Variables {
		if variable.Name == name {
			return true
		}
	}
	return false
}

func hasState(workflow ast.Workflow, name string) bool {
	_, ok := workflow.State[name]
	return ok
}

func hasSubWorkflow(workflow ast.Workflow, id string) bool {
	for _, sub := range workflow.Workflows {
		if sub.ID == id {
			return true
		}
	}
	return false
}

func diagnosticError(code, message, path string) diagnostic.Diagnostic {
	return diagnostic.Diagnostic{
		Code:     code,
		Severity: diagnostic.SeverityError,
		Message:  message,
		Path:     path,
	}
}
