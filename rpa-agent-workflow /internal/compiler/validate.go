package compiler

import (
	"encoding/json"
	"fmt"

	"rpa-agent-workflow/internal/ast"
	"rpa-agent-workflow/internal/block"
	"rpa-agent-workflow/internal/diagnostic"
	"rpa-agent-workflow/internal/schema"
)

func ValidateWorkflow(data []byte, blocks map[string]block.Definition) (*ast.Workflow, []diagnostic.Diagnostic) {
	if err := schema.ValidateAstBytes(data); err != nil {
		return nil, []diagnostic.Diagnostic{{
			Code:    "SCHEMA_INVALID",
			Severity: diagnostic.SeverityError,
			Message: err.Error(),
			Path:    "$",
		}}
	}

	var workflow ast.Workflow
	if err := json.Unmarshal(data, &workflow); err != nil {
		return nil, []diagnostic.Diagnostic{{
			Code:    "JSON_SYNTAX",
			Severity: diagnostic.SeverityError,
			Message: err.Error(),
			Path:    "$",
		}}
	}

	if len(workflow.Body.Kind) == 0 {
		return &workflow, []diagnostic.Diagnostic{{
			Code:    "SCHEMA_INVALID",
			Severity: diagnostic.SeverityError,
			Message: "missing body.kind",
			Path:    "$.body.kind",
		}}
	}

	return &workflow, validateStatement(workflow.Body, blocks, "$.body")
}

func validateStatement(stmt ast.Statement, blocks map[string]block.Definition, path string) []diagnostic.Diagnostic {
	var diags []diagnostic.Diagnostic
	switch stmt.Kind {
	case "sequence":
		for i, child := range stmt.Statements {
			diags = append(diags, validateStatement(child, blocks, fmt.Sprintf("%s.statements[%d]", path, i))...)
		}
	case "parallel":
		for i, branch := range stmt.Branches {
			for j, child := range branch.Body {
				diags = append(diags, validateStatement(child, blocks, fmt.Sprintf("%s.branches[%d].body[%d]", path, i, j))...)
			}
		}
	case "callBlock":
		if _, ok := blocks[stmt.Block]; !ok {
			diags = append(diags, diagnostic.Diagnostic{
				Code:    "UNKNOWN_BLOCK",
				Severity: diagnostic.SeverityError,
				Message: fmt.Sprintf("unknown block %q", stmt.Block),
				Path:    path + ".block",
				Related: stmt.ID,
			})
		}
	default:
		diags = append(diags, diagnostic.Diagnostic{
			Code:    "UNSUPPORTED_STATEMENT",
			Severity: diagnostic.SeverityError,
			Message: fmt.Sprintf("unsupported statement kind %q", stmt.Kind),
			Path:    path + ".kind",
			Related: stmt.ID,
		})
	}
	return diags
}

func validateBlockRef(stmt ast.Statement, blocks map[string]block.Definition) []diagnostic.Diagnostic {
	if blocks == nil {
		return []diagnostic.Diagnostic{{
			Code:    "UNKNOWN_BLOCK",
			Severity: diagnostic.SeverityError,
			Message: fmt.Sprintf("unknown block %q", stmt.Block),
			Path:    "$.body.block",
			Related: stmt.ID,
		}}
	}
	return nil
}
