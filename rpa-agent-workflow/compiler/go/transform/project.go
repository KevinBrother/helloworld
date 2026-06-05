package transform

import (
	"fmt"
	"sort"
	"strings"

	"rpa-agent-workflow/contracts/ast"
	"rpa-agent-workflow/contracts/block"
	uinode "rpa-agent-workflow/contracts/ui-node"
)

const uiNodeSchemaVersion = "1.0.0"

func ProjectWorkflow(workflow ast.Workflow) uinode.Document {
	return ProjectWorkflowWithBlocks(workflow, nil)
}

func ProjectWorkflowWithBlocks(workflow ast.Workflow, blocks map[string]block.Definition) uinode.Document {
	ctx := projectionContext{
		blocks:          blocks,
		tokens:          workflowTokens(workflow),
		workflowOutputs: workflow.Outputs,
	}
	root := projectStatement(workflow.Body, "$.body", 0)
	root.Label = "Start"
	root.Metadata = mergeNodeMetadata(root.Metadata, map[string]any{
		"allowCustomInput": true,
	})
	root.Inspector = append(root.Inspector, workflowPortInspectorFields("$.inputs", "Input", workflow.Inputs)...)
	root.Children = projectStatementsWithContext(workflow.Body.Statements, "$.body.statements", 0, ctx)
	return uinode.Document{
		SchemaVersion: uiNodeSchemaVersion,
		WorkflowID:    workflow.Workflow.ID,
		Root:          root,
		Metadata: map[string]any{
			"workflowName": workflow.Workflow.Name,
		},
	}
}

type projectionContext struct {
	blocks          map[string]block.Definition
	tokens          []map[string]any
	workflowOutputs []ast.Port
}

func workflowTokens(workflow ast.Workflow) []map[string]any {
	tokens := make([]map[string]any, 0, len(workflow.Inputs)+len(workflow.State))
	for _, input := range workflow.Inputs {
		tokens = append(tokens, tokenMap("Inputs", "input."+input.Name, input.Name, input.Type.Name, "Workflow input"))
	}
	stateNames := make([]string, 0, len(workflow.State))
	for name := range workflow.State {
		stateNames = append(stateNames, name)
	}
	sort.Strings(stateNames)
	for _, name := range stateNames {
		tokens = append(tokens, tokenMap("Global State", "state."+name, name, workflow.State[name].Type.Name, "Global state"))
	}
	return tokens
}

func tokenMap(group string, ref string, label string, typ string, detail string) map[string]any {
	return map[string]any{
		"group":  group,
		"ref":    ref,
		"label":  label,
		"type":   typ,
		"detail": detail,
	}
}

func workflowPortInspectorFields(path string, labelPrefix string, ports []ast.Port) []uinode.InspectorField {
	fields := make([]uinode.InspectorField, 0, len(ports))
	for _, port := range ports {
		fields = append(fields, uinode.InspectorField{
			Path:     path + "." + port.Name,
			Label:    labelPrefix + " " + port.Name,
			Control:  "port",
			Value:    port,
			Readonly: true,
		})
	}
	return fields
}

func projectStatement(stmt ast.Statement, path string, lane int) uinode.Node {
	return projectStatementWithContext(stmt, path, lane, projectionContext{})
}

func projectStatementWithContext(stmt ast.Statement, path string, lane int, ctx projectionContext) uinode.Node {
	outputs := outputTokensForStatement(stmt, ctx.blocks)
	node := uinode.Node{
		ID:           stmt.ID,
		Kind:         stmt.Kind,
		Label:        labelForStatement(stmt),
		Path:         path,
		Layout:       layoutForKind(stmt.Kind, lane),
		Collapsed:    metadataCollapsed(stmt.Metadata),
		Editable:     true,
		Capabilities: capabilitiesForStatement(stmt, path),
		Inspector:    inspectorForStatement(stmt, path, ctx),
		Metadata:     nodeMetadataWithOutputs(stmt, outputs, ctx.blocks),
	}

	switch stmt.Kind {
	case "sequence":
		node.Children = projectStatementsWithContext(stmt.Statements, path+".statements", lane, ctx)
	case "loop":
		loopCtx := ctx.withTokens(loopTokens(stmt))
		node.Children = projectStatementsWithContext(stmt.Statements, path+".statements", lane, loopCtx)
	case "if":
		node.Branches = projectIfBranches(stmt, path, lane, ctx)
	case "parallel":
		node.Branches = projectParallelBranches(stmt, path, ctx)
	case "try":
		node.Branches = []uinode.Branch{
			{
				ID:       stmt.ID + ".try",
				Label:    "Try",
				Kind:     "try",
				Children: projectStatementsWithContext(stmt.Statements, path+".statements", lane, ctx),
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
				Children: projectStatementsWithContext(clause.Body, fmt.Sprintf("%s.catches[%d].body", path, i), i+1, ctx),
			})
		}
		node.Branches = append(node.Branches, uinode.Branch{
			ID:       stmt.ID + ".finally",
			Label:    "Finally",
			Kind:     "finally",
			Children: projectStatementsWithContext(stmt.Finally, path+".finally", len(stmt.Catches)+1, ctx),
		})
	}

	return node
}

func projectIfBranches(stmt ast.Statement, path string, lane int, ctx projectionContext) []uinode.Branch {
	if len(stmt.Branches) > 0 {
		branches := make([]uinode.Branch, 0, len(stmt.Branches))
		conditionIndex := 0
		for i, branch := range stmt.Branches {
			kind := "condition"
			label := branch.Label
			if branch.Default {
				kind = "default"
				if label == "" {
					label = "否则"
				}
			} else {
				conditionIndex++
				if label == "" {
					label = fmt.Sprintf("条件 %d", conditionIndex)
				}
			}
			branches = append(branches, uinode.Branch{
				ID:       branch.ID,
				Label:    label,
				Kind:     kind,
				Children: projectStatementsWithContext(branch.Body, fmt.Sprintf("%s.branches[%d].body", path, i), i, ctx),
			})
		}
		return branches
	}

	return []uinode.Branch{
		{
			ID:       stmt.ID + ".then",
			Label:    "条件 1",
			Kind:     "condition",
			Children: projectStatementsWithContext(stmt.Then, path+".then", lane, ctx),
		},
		{
			ID:       stmt.ID + ".else",
			Label:    "否则",
			Kind:     "default",
			Children: projectStatementsWithContext(stmt.Else, path+".else", lane, ctx),
		},
	}
}

func projectParallelBranches(stmt ast.Statement, path string, ctx projectionContext) []uinode.Branch {
	branches := make([]uinode.Branch, 0, len(stmt.Branches))
	for i, branch := range stmt.Branches {
		label := branch.Label
		if label == "" {
			label = fmt.Sprintf("并行 %d", i+1)
		}
		branches = append(branches, uinode.Branch{
			ID:       branch.ID,
			Label:    label,
			Kind:     "parallel",
			Children: projectStatementsWithContext(branch.Body, fmt.Sprintf("%s.branches[%d].body", path, i), i, ctx),
		})
	}
	return branches
}

func (ctx projectionContext) withTokens(tokens []map[string]any) projectionContext {
	next := projectionContext{
		blocks:          ctx.blocks,
		tokens:          append([]map[string]any{}, ctx.tokens...),
		workflowOutputs: ctx.workflowOutputs,
	}
	next.tokens = append(next.tokens, tokens...)
	return next
}

func projectStatements(stmts []ast.Statement, path string) []uinode.Node {
	return projectStatementsWithLane(stmts, path, 0)
}

func projectStatementsWithLane(stmts []ast.Statement, path string, lane int) []uinode.Node {
	return projectStatementsWithContext(stmts, path, lane, projectionContext{})
}

func projectStatementsWithContext(stmts []ast.Statement, path string, lane int, ctx projectionContext) []uinode.Node {
	children := make([]uinode.Node, 0, len(stmts))
	current := ctx
	for i, child := range stmts {
		children = append(children, projectStatementWithContext(child, fmt.Sprintf("%s[%d]", path, i), lane, current))
		current = current.withTokens(outputTokensForStatement(child, current.blocks))
	}
	return children
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

func capabilitiesForStatement(stmt ast.Statement, path string) uinode.Capabilities {
	caps := uinode.Capabilities{
		ToggleCollapsed: uinode.Capability{Enabled: true, Label: "Collapse"},
		UpdateField:     uinode.Capability{Enabled: true, Label: "Edit Metadata"},
		InsertNode:      uinode.Capability{Enabled: false, Label: "Insert Step", Reason: "Node kind does not accept child statements"},
		DeleteNode:      uinode.Capability{Enabled: true, Label: "Delete"},
		MoveStatement:   uinode.Capability{Enabled: true, Label: "Move"},
		DuplicateNode:   uinode.Capability{Enabled: true, Label: "Duplicate"},
		ReplaceSubtree:  uinode.Capability{Enabled: true, Label: "Replace", TargetPath: path},
	}

	if stmt.ID == "root" || path == "$.body" {
		caps.DeleteNode = uinode.Capability{Enabled: false, Label: "Delete", Reason: "Root node cannot be deleted"}
		caps.MoveStatement = uinode.Capability{Enabled: false, Label: "Move", Reason: "Root node cannot be moved"}
		caps.DuplicateNode = uinode.Capability{Enabled: false, Label: "Duplicate", Reason: "Root node cannot be duplicated"}
	}

	switch stmt.Kind {
	case "sequence", "loop", "if", "parallel", "try":
		caps.InsertNode = uinode.Capability{
			Enabled:    true,
			Label:      "Insert Step",
			TargetPath: insertionTargetPath(stmt.Kind, path),
			Metadata:   insertionMetadata(stmt.Kind, path),
		}
	}
	return caps
}

func insertionTargetPath(kind string, path string) string {
	switch kind {
	case "sequence", "loop", "try":
		return path + ".statements"
	case "if":
		return path + ".then"
	case "parallel":
		return path + ".branches"
	default:
		return ""
	}
}

func insertionMetadata(kind string, path string) map[string]any {
	switch kind {
	case "if":
		return map[string]any{"targetPaths": []string{path + ".then", path + ".else"}}
	case "try":
		return map[string]any{"targetPaths": []string{path + ".statements", path + ".finally"}}
	default:
		return nil
	}
}

func inspectorForStatement(stmt ast.Statement, path string, ctx projectionContext) []uinode.InspectorField {
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
	fields = append(fields, expressionMapInspectorFields(path+".inputs", "Input", stmt.Inputs, ctx.tokens)...)
	fields = append(fields, expressionMapInspectorFields(path+".outputs", "Output", stmt.Outputs, ctx.tokens)...)
	if stmt.Value != nil {
		fields = append(fields, expressionInspectorField(path+".value", "Value", *stmt.Value, ctx.tokens))
	}
	if stmt.Condition != nil {
		fields = append(fields, expressionInspectorField(path+".condition", "Condition", *stmt.Condition, ctx.tokens))
	}
	if stmt.Iterable != nil {
		fields = append(fields, expressionInspectorField(path+".iterable", "Iterable", *stmt.Iterable, ctx.tokens))
	}
	if stmt.Kind == "return" {
		fields = append(fields, workflowPortInspectorFields("$.outputs", "Output", ctx.workflowOutputs)...)
	}
	fields = append(fields, expressionMapInspectorFields(path+".returns", "Return", stmt.Returns, ctx.tokens)...)
	return fields
}

func expressionMapInspectorFields(path string, labelPrefix string, expressions map[string]ast.Expression, tokens []map[string]any) []uinode.InspectorField {
	if len(expressions) == 0 {
		return nil
	}
	names := make([]string, 0, len(expressions))
	for name := range expressions {
		names = append(names, name)
	}
	sort.Strings(names)
	fields := make([]uinode.InspectorField, 0, len(names))
	for _, name := range names {
		fields = append(fields, expressionInspectorField(path+"."+name, labelPrefix+" "+name, expressions[name], tokens))
	}
	return fields
}

func expressionInspectorField(path string, label string, value ast.Expression, tokens []map[string]any) uinode.InspectorField {
	field := uinode.InspectorField{
		Path:    path,
		Label:   label,
		Control: "expression",
		Value:   value,
	}
	if len(tokens) > 0 {
		field.Metadata = map[string]any{
			"availableTokens": cloneTokens(tokens),
		}
	}
	return field
}

func outputTokensForStatement(stmt ast.Statement, blocks map[string]block.Definition) []map[string]any {
	switch stmt.Kind {
	case "callBlock":
		if blockDef, ok := blocks[stmt.Block]; ok && len(blockDef.Outputs) > 0 {
			tokens := make([]map[string]any, 0, len(blockDef.Outputs))
			for _, output := range blockDef.Outputs {
				tokens = append(tokens, tokenMap(
					"Upstream Outputs",
					"node."+stmt.ID+"."+output.Name,
					stmt.ID+"."+output.Name,
					output.Type.Name,
					labelForStatement(stmt),
				))
			}
			return tokens
		}
		return outputTokensFromExpressionMap(stmt)
	case "if", "callWorkflow", "parallel":
		return outputTokensFromExpressionMap(stmt)
	default:
		return nil
	}
}

func outputTokensFromExpressionMap(stmt ast.Statement) []map[string]any {
	if len(stmt.Outputs) == 0 {
		return nil
	}
	names := make([]string, 0, len(stmt.Outputs))
	for name := range stmt.Outputs {
		names = append(names, name)
	}
	sort.Strings(names)
	tokens := make([]map[string]any, 0, len(names))
	for _, name := range names {
		tokens = append(tokens, tokenMap(
			"Upstream Outputs",
			"node."+stmt.ID+"."+name,
			stmt.ID+"."+name,
			"",
			labelForStatement(stmt),
		))
	}
	return tokens
}

func loopTokens(stmt ast.Statement) []map[string]any {
	if stmt.ID == "" {
		return nil
	}
	return []map[string]any{
		tokenMap("Context Loop", "loop."+stmt.ID+".current_item", "current_item", "", labelForStatement(stmt)),
		tokenMap("Context Loop", "loop."+stmt.ID+".index", "index", "number", labelForStatement(stmt)),
	}
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
	if stmt.Kind == "return" {
		metadata["allowCustomOutput"] = true
	}
	if len(metadata) == 0 {
		return nil
	}
	return metadata
}

func mergeNodeMetadata(base map[string]any, extra map[string]any) map[string]any {
	if len(base) == 0 {
		base = make(map[string]any, len(extra))
	}
	for key, value := range extra {
		base[key] = value
	}
	return base
}

func nodeMetadataWithOutputs(stmt ast.Statement, outputs []map[string]any, blocks map[string]block.Definition) map[string]any {
	metadata := nodeMetadata(stmt)
	if metadata == nil {
		metadata = make(map[string]any)
	}
	if len(outputs) > 0 {
		metadata["outputs"] = cloneTokens(outputs)
	}
	if stmt.Block != "" {
		title := labelForStatement(stmt)
		if blockDef, ok := blocks[stmt.Block]; ok {
			if blockDef.Display.Label != "" {
				title = blockDef.Display.Label
			}
			if blockDef.Description != "" {
				metadata["description"] = blockDef.Description
			}
		}
		metadata["title"] = title
		metadata["onError"] = "default"
	}
	if len(metadata) == 0 {
		return nil
	}
	return metadata
}

func cloneTokens(tokens []map[string]any) []map[string]any {
	clone := make([]map[string]any, 0, len(tokens))
	for _, token := range tokens {
		next := make(map[string]any, len(token))
		for key, value := range token {
			next[key] = value
		}
		clone = append(clone, next)
	}
	return clone
}

func metadataCollapsed(metadata map[string]any) bool {
	ui, ok := metadata["ui"].(map[string]any)
	if !ok {
		return false
	}
	collapsed, _ := ui["collapsed"].(bool)
	return collapsed
}
