package transform

import (
	"fmt"
	"sort"
	"strings"

	"rpa-agent-workflow/contracts/ast"
	uinode "rpa-agent-workflow/contracts/ui-node"
)

const uiNodeSchemaVersion = "1.0.0"

func ProjectWorkflow(workflow ast.Workflow) uinode.Document {
	root := projectStatement(workflow.Body, "$.body", 0)
	nodes := flattenNodes(root)
	return uinode.Document{
		SchemaVersion: uiNodeSchemaVersion,
		WorkflowID:    workflow.Workflow.ID,
		Root:          root,
		Nodes:         nodes,
		Metadata: map[string]any{
			"workflowName": workflow.Workflow.Name,
		},
	}
}

func projectStatement(stmt ast.Statement, path string, lane int) uinode.Node {
	node := uinode.Node{
		ID:         stmt.ID,
		Kind:       stmt.Kind,
		Label:      labelForStatement(stmt),
		Path:       path,
		Layout:     layoutForKind(stmt.Kind, lane),
		Collapsed:  metadataCollapsed(stmt.Metadata),
		Editable:   true,
		Operations: operationsForKind(stmt.Kind),
		Inspector:  inspectorForStatement(stmt, path),
		Metadata:   nodeMetadata(stmt),
	}

	switch stmt.Kind {
	case "sequence":
		node.Children = projectStatements(stmt.Statements, path+".statements")
	case "loop":
		node.Children = projectStatements(stmt.Statements, path+".statements")
	case "if":
		node.Branches = []uinode.Branch{
			{
				ID:       stmt.ID + ".then",
				Label:    "Then",
				Kind:     "then",
				Children: projectStatements(stmt.Then, path+".then"),
			},
			{
				ID:       stmt.ID + ".else",
				Label:    "Else",
				Kind:     "else",
				Children: projectStatements(stmt.Else, path+".else"),
			},
		}
	case "parallel":
		node.Branches = make([]uinode.Branch, 0, len(stmt.Branches))
		for i, branch := range stmt.Branches {
			node.Branches = append(node.Branches, uinode.Branch{
				ID:       branch.ID,
				Label:    branchLabel(branch.ID),
				Kind:     "parallel",
				Children: projectStatementsWithLane(branch.Body, fmt.Sprintf("%s.branches[%d].body", path, i), i),
			})
		}
	case "try":
		node.Branches = []uinode.Branch{
			{
				ID:       stmt.ID + ".try",
				Label:    "Try",
				Kind:     "try",
				Children: projectStatements(stmt.Statements, path+".statements"),
			},
		}
		for i, clause := range stmt.Catches {
			label := "Catch"
			if clause.Pattern != "" {
				label = "Catch " + clause.Pattern
			}
			node.Branches = append(node.Branches, uinode.Branch{
				ID:       fmt.Sprintf("%s.catch[%d]", stmt.ID, i),
				Label:    label,
				Kind:     "catch",
				Children: projectStatementsWithLane(clause.Body, fmt.Sprintf("%s.catches[%d].body", path, i), i+1),
			})
		}
		node.Branches = append(node.Branches, uinode.Branch{
			ID:       stmt.ID + ".finally",
			Label:    "Finally",
			Kind:     "finally",
			Children: projectStatementsWithLane(stmt.Finally, path+".finally", len(stmt.Catches)+1),
		})
	}

	return node
}

func projectStatements(stmts []ast.Statement, path string) []uinode.Node {
	return projectStatementsWithLane(stmts, path, 0)
}

func projectStatementsWithLane(stmts []ast.Statement, path string, lane int) []uinode.Node {
	children := make([]uinode.Node, 0, len(stmts))
	for i, child := range stmts {
		children = append(children, projectStatement(child, fmt.Sprintf("%s[%d]", path, i), lane))
	}
	return children
}

func flattenNodes(root uinode.Node) []uinode.Node {
	nodes := []uinode.Node{root}
	for _, child := range root.Children {
		nodes = append(nodes, flattenNodes(child)...)
	}
	for _, branch := range root.Branches {
		for _, child := range branch.Children {
			nodes = append(nodes, flattenNodes(child)...)
		}
	}
	return nodes
}

func layoutForKind(kind string, lane int) uinode.Layout {
	direction := "top-down"
	switch kind {
	case "parallel":
		direction = "lanes"
	case "if", "try":
		direction = "branches"
	}
	return uinode.Layout{
		Direction: direction,
		Width:     280,
		Height:    92,
		Lane:      lane,
	}
}

func operationsForKind(kind string) []uinode.Operation {
	ops := []uinode.Operation{
		{Type: "toggleCollapsed", Label: "Collapse", Enabled: true},
		{Type: "updateField", Label: "Edit Metadata", Enabled: true},
	}
	switch kind {
	case "sequence", "loop", "if", "parallel", "try":
		ops = append(ops, uinode.Operation{Type: "insertNode", Label: "Insert Step", Enabled: true})
	default:
		ops = append(ops,
			uinode.Operation{Type: "duplicateNode", Label: "Duplicate", Enabled: true},
			uinode.Operation{Type: "deleteNode", Label: "Delete", Enabled: true},
		)
	}
	return ops
}

func inspectorForStatement(stmt ast.Statement, path string) []uinode.InspectorField {
	fields := []uinode.InspectorField{
		{Path: path + ".id", Label: "ID", Control: "text", Value: stmt.ID, Readonly: true},
		{Path: path + ".kind", Label: "Kind", Control: "text", Value: stmt.Kind, Readonly: true},
	}
	if stmt.Block != "" {
		fields = append(fields, uinode.InspectorField{Path: path + ".block", Label: "Block", Control: "text", Value: stmt.Block, Readonly: true})
	}
	if stmt.Workflow != "" {
		fields = append(fields, uinode.InspectorField{Path: path + ".workflow", Label: "Workflow", Control: "text", Value: stmt.Workflow, Readonly: true})
	}
	if stmt.Target != "" {
		fields = append(fields, uinode.InspectorField{Path: path + ".target", Label: "Target", Control: "text", Value: stmt.Target, Readonly: true})
	}
	if stmt.LoopKind != "" {
		fields = append(fields, uinode.InspectorField{Path: path + ".loopKind", Label: "Loop Kind", Control: "text", Value: stmt.LoopKind, Readonly: true})
	}
	if stmt.ItemVar != "" {
		fields = append(fields, uinode.InspectorField{Path: path + ".itemVar", Label: "Item Variable", Control: "text", Value: stmt.ItemVar, Readonly: true})
	}
	return fields
}

func labelForStatement(stmt ast.Statement) string {
	switch stmt.Kind {
	case "callBlock":
		if stmt.Block != "" {
			return stmt.Block
		}
	case "callWorkflow":
		if stmt.Workflow != "" {
			return "Workflow " + stmt.Workflow
		}
	case "assign":
		if stmt.Target != "" {
			return "Set " + stmt.Target
		}
	case "loop":
		if stmt.LoopKind != "" {
			return titleWords(stmt.LoopKind) + " Loop"
		}
	case "return":
		return "Return"
	}
	if stmt.ID != "" {
		return branchLabel(stmt.ID)
	}
	return branchLabel(stmt.Kind)
}

func branchLabel(id string) string {
	parts := strings.FieldsFunc(id, func(r rune) bool {
		return r == '_' || r == '-' || r == '.'
	})
	for i := range parts {
		if parts[i] == "" {
			continue
		}
		parts[i] = strings.ToUpper(parts[i][:1]) + parts[i][1:]
	}
	return strings.Join(parts, " ")
}

func titleWords(value string) string {
	return branchLabel(value)
}

func nodeMetadata(stmt ast.Statement) map[string]any {
	metadata := make(map[string]any)
	if stmt.LoopKind != "" {
		metadata["loopKind"] = stmt.LoopKind
	}
	if stmt.ItemVar != "" {
		metadata["itemVar"] = stmt.ItemVar
	}
	if stmt.Join != nil {
		metadata["join"] = map[string]any{
			"strategy":  stmt.Join.Strategy,
			"timeoutMs": stmt.Join.TimeoutMs,
			"onError":   stmt.Join.OnError,
		}
	}
	if len(stmt.Returns) > 0 {
		keys := make([]string, 0, len(stmt.Returns))
		for key := range stmt.Returns {
			keys = append(keys, key)
		}
		sort.Strings(keys)
		metadata["returns"] = keys
	}
	if len(metadata) == 0 {
		return nil
	}
	return metadata
}

func metadataCollapsed(metadata map[string]any) bool {
	ui, ok := metadata["ui"].(map[string]any)
	if !ok {
		return false
	}
	collapsed, _ := ui["collapsed"].(bool)
	return collapsed
}
