package python

import (
	"fmt"
	"sort"
	"strings"

	"rpa-agent-workflow/contracts/ast"
	"rpa-agent-workflow/contracts/block"
)

func Generate(workflow *ast.Workflow, blocks map[string]block.Definition) (string, error) {
	if workflow == nil {
		return "", fmt.Errorf("workflow is nil")
	}
	var b strings.Builder
	b.WriteString("import json\n")
	b.WriteString("import sys\n\n")
	b.WriteString("from rpa_sdk.runtime import WorkflowRuntime\n\n")
	b.WriteString("BLOCKS = ")
	b.WriteString(renderBlockBindings(blocks))
	b.WriteString("\n\n")
	b.WriteString("WORKFLOWS = ")
	b.WriteString(renderSubWorkflows(workflow.Workflows))
	b.WriteString("\n\n")
	b.WriteString("WORKFLOW = ")
	b.WriteString(renderStatement(workflow.Body))
	b.WriteString("\n\n")
	b.WriteString("def load_workflow_inputs(argv):\n")
	b.WriteString("    if len(argv) < 2:\n")
	b.WriteString("        return {}\n")
	b.WriteString("    if len(argv) > 2:\n")
	b.WriteString("        raise SystemExit(\"usage: python workflow.py [input.json|-]\")\n")
	b.WriteString("    source = argv[1]\n")
	b.WriteString("    if source == \"-\":\n")
	b.WriteString("        raw = sys.stdin.read()\n")
	b.WriteString("    else:\n")
	b.WriteString("        with open(source, \"r\", encoding=\"utf-8\") as input_file:\n")
	b.WriteString("            raw = input_file.read()\n")
	b.WriteString("    if not raw.strip():\n")
	b.WriteString("        return {}\n")
	b.WriteString("    inputs = json.loads(raw)\n")
	b.WriteString("    if not isinstance(inputs, dict):\n")
	b.WriteString("        raise SystemExit(\"workflow input json must be an object\")\n")
	b.WriteString("    return inputs\n")
	b.WriteString("\n")
	b.WriteString("async def main(argv=None):\n")
	b.WriteString("    workflow_inputs = load_workflow_inputs(sys.argv if argv is None else argv)\n")
	b.WriteString("    runtime = WorkflowRuntime(blocks=BLOCKS, workflows=WORKFLOWS)\n")
	b.WriteString("    return await runtime.run_workflow(WORKFLOW, workflow_inputs)\n")
	b.WriteString("\nif __name__ == \"__main__\":\n")
	b.WriteString("    import asyncio\n")
	b.WriteString("    result = asyncio.run(main())\n")
	b.WriteString("    print(json.dumps({\"returns\": result}, ensure_ascii=False, indent=2))\n")
	return b.String(), nil
}

func renderBlockBindings(blocks map[string]block.Definition) string {
	keys := make([]string, 0, len(blocks))
	for key := range blocks {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	var b strings.Builder
	b.WriteString("{")
	for i, key := range keys {
		if i > 0 {
			b.WriteString(", ")
		}
		binding := blocks[key].Runtime
		b.WriteString(fmt.Sprintf("%q: {\"target\": %q, \"module\": %q, \"callable\": %q, \"mode\": %q}", key, binding.Target, binding.Module, binding.Callable, binding.Mode))
	}
	b.WriteString("}")
	return b.String()
}

func renderSubWorkflows(workflows []ast.SubWorkflow) string {
	var b strings.Builder
	b.WriteString("{")
	for i, workflow := range workflows {
		if i > 0 {
			b.WriteString(", ")
		}
		b.WriteString(fmt.Sprintf("%q: {\"body\": %s}", workflow.ID, renderStatement(workflow.Body)))
	}
	b.WriteString("}")
	return b.String()
}

func renderStatement(stmt ast.Statement) string {
	var b strings.Builder
	b.WriteString("{")
	b.WriteString(fmt.Sprintf("\"id\": %q, ", stmt.ID))
	b.WriteString(fmt.Sprintf("\"kind\": %q", stmt.Kind))
	if stmt.Block != "" {
		b.WriteString(fmt.Sprintf(", \"block\": %q", stmt.Block))
	}
	if stmt.Workflow != "" {
		b.WriteString(fmt.Sprintf(", \"workflow\": %q", stmt.Workflow))
	}
	if stmt.Target != "" {
		b.WriteString(fmt.Sprintf(", \"target\": %q", stmt.Target))
	}
	if stmt.LoopKind != "" {
		b.WriteString(fmt.Sprintf(", \"loopKind\": %q", stmt.LoopKind))
	}
	if stmt.ItemVar != "" {
		b.WriteString(fmt.Sprintf(", \"itemVar\": %q", stmt.ItemVar))
	}
	if stmt.Value != nil {
		b.WriteString(", \"value\": ")
		b.WriteString(renderExpression(*stmt.Value))
	}
	if stmt.Condition != nil {
		b.WriteString(", \"condition\": ")
		b.WriteString(renderExpression(*stmt.Condition))
	}
	if stmt.Iterable != nil {
		b.WriteString(", \"iterable\": ")
		b.WriteString(renderExpression(*stmt.Iterable))
	}
	if len(stmt.Inputs) > 0 {
		b.WriteString(", \"inputs\": ")
		b.WriteString(renderExpressionMap(stmt.Inputs))
	}
	if len(stmt.Outputs) > 0 {
		b.WriteString(", \"outputs\": ")
		b.WriteString(renderExpressionMap(stmt.Outputs))
	}
	if len(stmt.Returns) > 0 {
		b.WriteString(", \"returns\": ")
		b.WriteString(renderExpressionMap(stmt.Returns))
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
	if len(stmt.Then) > 0 {
		b.WriteString(", \"then\": ")
		b.WriteString(renderStatementList(stmt.Then))
	}
	if len(stmt.Else) > 0 {
		b.WriteString(", \"else\": ")
		b.WriteString(renderStatementList(stmt.Else))
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
	if len(stmt.Catches) > 0 {
		b.WriteString(", \"catches\": [")
		for i, clause := range stmt.Catches {
			if i > 0 {
				b.WriteString(", ")
			}
			b.WriteString("{")
			b.WriteString(fmt.Sprintf("\"pattern\": %q, \"body\": ", clause.Pattern))
			b.WriteString(renderStatementList(clause.Body))
			b.WriteString("}")
		}
		b.WriteString("]")
	}
	if len(stmt.Finally) > 0 {
		b.WriteString(", \"finally\": ")
		b.WriteString(renderStatementList(stmt.Finally))
	}
	if stmt.Join != nil {
		b.WriteString(", \"join\": {")
		b.WriteString(fmt.Sprintf("\"strategy\": %q", stmt.Join.Strategy))
		if stmt.Join.TimeoutMs > 0 {
			b.WriteString(fmt.Sprintf(", \"timeoutMs\": %d", stmt.Join.TimeoutMs))
		}
		if stmt.Join.OnError != "" {
			b.WriteString(fmt.Sprintf(", \"onError\": %q", stmt.Join.OnError))
		}
		b.WriteString("}")
	}
	b.WriteString("}")
	return b.String()
}

func renderExpression(expr ast.Expression) string {
	switch expr.Kind {
	case "literal":
		return fmt.Sprintf("{\"kind\": \"literal\", \"value\": %s}", renderLiteral(expr.Value))
	case "ref":
		return fmt.Sprintf("{\"kind\": \"ref\", \"ref\": %q}", expr.Ref)
	case "binary":
		operator := ""
		if expr.Operator != nil {
			operator = fmt.Sprintf(", \"operator\": %s", renderExpression(*expr.Operator))
		}
		return fmt.Sprintf("{\"kind\": \"binary\", \"op\": %q%s, \"left\": %s, \"right\": %s}", expr.Op, operator, renderOptionalExpression(expr.Left), renderOptionalExpression(expr.Right))
	case "array":
		var b strings.Builder
		b.WriteString("{\"kind\": \"array\", \"items\": [")
		for i, item := range expr.Items {
			if i > 0 {
				b.WriteString(", ")
			}
			b.WriteString(renderExpression(item))
		}
		b.WriteString("]}")
		return b.String()
	case "object":
		var b strings.Builder
		b.WriteString("{\"kind\": \"object\", \"fields\": ")
		b.WriteString(renderExpressionMap(expr.Fields))
		b.WriteString("}")
		return b.String()
	case "branch":
		var b strings.Builder
		b.WriteString("{\"kind\": \"branch\", \"fields\": ")
		b.WriteString(renderExpressionMap(expr.Fields))
		b.WriteString("}")
		return b.String()
	default:
		return fmt.Sprintf("{\"kind\": %q}", expr.Kind)
	}
}

func renderStatementList(stmts []ast.Statement) string {
	var b strings.Builder
	b.WriteString("[")
	for i, child := range stmts {
		if i > 0 {
			b.WriteString(", ")
		}
		b.WriteString(renderStatement(child))
	}
	b.WriteString("]")
	return b.String()
}

func renderExpressionMap(values map[string]ast.Expression) string {
	keys := make([]string, 0, len(values))
	for k := range values {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	var b strings.Builder
	b.WriteString("{")
	for i, k := range keys {
		if i > 0 {
			b.WriteString(", ")
		}
		b.WriteString(fmt.Sprintf("%q: %s", k, renderExpression(values[k])))
	}
	b.WriteString("}")
	return b.String()
}

func renderOptionalExpression(expr *ast.Expression) string {
	if expr == nil {
		return "None"
	}
	return renderExpression(*expr)
}

func renderLiteral(value any) string {
	switch typed := value.(type) {
	case string:
		return fmt.Sprintf("%q", typed)
	case bool:
		if typed {
			return "True"
		}
		return "False"
	case float64:
		return fmt.Sprintf("%v", typed)
	case int:
		return fmt.Sprintf("%d", typed)
	case nil:
		return "None"
	default:
		return fmt.Sprintf("%q", fmt.Sprint(typed))
	}
}
