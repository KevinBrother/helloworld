package python

import (
	"fmt"
	"sort"
	"strings"

	"rpa-agent-workflow/internal/ast"
	"rpa-agent-workflow/internal/block"
)

func Generate(workflow *ast.Workflow, blocks map[string]block.Definition) (string, error) {
	if workflow == nil {
		return "", fmt.Errorf("workflow is nil")
	}
	var b strings.Builder
	b.WriteString("from rpa_runtime.runtime import WorkflowRuntime\n\n")
	b.WriteString("WORKFLOW = ")
	b.WriteString(renderStatement(workflow.Body))
	b.WriteString("\n\n")
	b.WriteString("async def main():\n")
	b.WriteString("    runtime = WorkflowRuntime()\n")
	b.WriteString("    return await runtime.run_workflow(WORKFLOW)\n")
	b.WriteString("\nif __name__ == \"__main__\":\n")
	b.WriteString("    import asyncio\n")
	b.WriteString("    asyncio.run(main())\n")
	return b.String(), nil
}

func renderStatement(stmt ast.Statement) string {
	var b strings.Builder
	b.WriteString("{")
	b.WriteString(fmt.Sprintf("\"id\": %q, ", stmt.ID))
	b.WriteString(fmt.Sprintf("\"kind\": %q", stmt.Kind))
	if stmt.Block != "" {
		b.WriteString(fmt.Sprintf(", \"block\": %q", stmt.Block))
	}
	if len(stmt.Inputs) > 0 {
		keys := make([]string, 0, len(stmt.Inputs))
		for k := range stmt.Inputs {
			keys = append(keys, k)
		}
		sort.Strings(keys)
		b.WriteString(", \"inputs\": {")
		for i, k := range keys {
			if i > 0 {
				b.WriteString(", ")
			}
			b.WriteString(fmt.Sprintf("%q: %s", k, renderExpression(stmt.Inputs[k])))
		}
		b.WriteString("}")
	}
	if len(stmt.Statements) > 0 {
		b.WriteString(", \"statements\": [")
		for i, child := range stmt.Statements {
			if i > 0 {
				b.WriteString(", ")
			}
			b.WriteString(renderStatement(child))
		}
		b.WriteString("]")
	}
	if len(stmt.Branches) > 0 {
		b.WriteString(", \"branches\": [")
		for i, branch := range stmt.Branches {
			if i > 0 {
				b.WriteString(", ")
			}
			b.WriteString("{")
			b.WriteString(fmt.Sprintf("\"id\": %q, \"body\": [", branch.ID))
			for j, child := range branch.Body {
				if j > 0 {
					b.WriteString(", ")
				}
				b.WriteString(renderStatement(child))
			}
			b.WriteString("]}")
		}
		b.WriteString("]")
	}
	b.WriteString("}")
	return b.String()
}

func renderExpression(expr ast.Expression) string {
	switch expr.Kind {
	case "literal":
		return fmt.Sprintf("{\"kind\": \"literal\", \"value\": %q}", expr.Value)
	case "ref":
		return fmt.Sprintf("{\"kind\": \"ref\", \"ref\": %q}", expr.Ref)
	default:
		return fmt.Sprintf("{\"kind\": %q}", expr.Kind)
	}
}
