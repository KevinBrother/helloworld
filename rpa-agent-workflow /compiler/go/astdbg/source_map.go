package astdbg

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strings"

	"rpa-agent-workflow/contracts/ast"
)

type SourceMap struct {
	byStatementID map[string]StatementLocation
	byLine        map[int][]StatementLocation
}

type StatementLocation struct {
	StatementID   string
	StatementKind string
	JSONPath      string
	Line          int
	Column        int
}

func BuildSourceMap(source []byte) (*SourceMap, error) {
	var workflow ast.Workflow
	if err := json.Unmarshal(source, &workflow); err != nil {
		return nil, err
	}

	sm := &SourceMap{
		byStatementID: map[string]StatementLocation{},
		byLine:        map[int][]StatementLocation{},
	}

	builder := sourceMapBuilder{
		source: source,
		mapper: sm,
	}
	if err := builder.walkWorkflow(workflow, "$"); err != nil {
		return nil, err
	}
	return sm, nil
}

func (m *SourceMap) Statement(id string) (StatementLocation, bool) {
	loc, ok := m.byStatementID[id]
	return loc, ok
}

func (m *SourceMap) StatementsForLine(line int) []StatementLocation {
	locations := m.byLine[line]
	if len(locations) == 0 {
		return nil
	}
	out := make([]StatementLocation, len(locations))
	copy(out, locations)
	return out
}

func (m *SourceMap) BreakpointForLine(line int) (Breakpoint, bool) {
	locations := m.byLine[line]
	if len(locations) == 0 {
		return Breakpoint{}, false
	}
	return Breakpoint{StatementID: locations[0].StatementID}, true
}

type sourceMapBuilder struct {
	source []byte
	mapper *SourceMap
}

func (b *sourceMapBuilder) walkWorkflow(workflow ast.Workflow, path string) error {
	if workflow.Body.ID != "" {
		if err := b.recordStatement(workflow.Body, path+".body"); err != nil {
			return err
		}
	}
	for i := range workflow.Workflows {
		sub := workflow.Workflows[i]
		if sub.Body.ID == "" {
			continue
		}
		if err := b.recordStatement(sub.Body, fmt.Sprintf("%s.workflows[%d].body", path, i)); err != nil {
			return err
		}
	}
	return nil
}

func (b *sourceMapBuilder) recordStatement(stmt ast.Statement, path string) error {
	if stmt.ID == "" {
		return nil
	}

	offset, err := b.findStatementOffset(stmt.ID, stmt.Kind)
	if err != nil {
		return err
	}
	line, column := offsetToLineColumn(b.source, offset)
	loc := StatementLocation{
		StatementID:   stmt.ID,
		StatementKind: stmt.Kind,
		JSONPath:      path,
		Line:          line,
		Column:        column,
	}
	b.mapper.byStatementID[stmt.ID] = loc
	b.mapper.byLine[line] = append(b.mapper.byLine[line], loc)

	switch stmt.Kind {
	case "sequence", "loop":
		for i := range stmt.Statements {
			if err := b.recordStatement(stmt.Statements[i], fmt.Sprintf("%s.statements[%d]", path, i)); err != nil {
				return err
			}
		}
	case "if":
		for i := range stmt.Then {
			if err := b.recordStatement(stmt.Then[i], fmt.Sprintf("%s.then[%d]", path, i)); err != nil {
				return err
			}
		}
		for i := range stmt.Else {
			if err := b.recordStatement(stmt.Else[i], fmt.Sprintf("%s.else[%d]", path, i)); err != nil {
				return err
			}
		}
	case "parallel":
		for i := range stmt.Branches {
			for j := range stmt.Branches[i].Body {
				if err := b.recordStatement(stmt.Branches[i].Body[j], fmt.Sprintf("%s.branches[%d].body[%d]", path, i, j)); err != nil {
					return err
				}
			}
		}
	case "try":
		for i := range stmt.Statements {
			if err := b.recordStatement(stmt.Statements[i], fmt.Sprintf("%s.statements[%d]", path, i)); err != nil {
				return err
			}
		}
		for i := range stmt.Catches {
			for j := range stmt.Catches[i].Body {
				if err := b.recordStatement(stmt.Catches[i].Body[j], fmt.Sprintf("%s.catches[%d].body[%d]", path, i, j)); err != nil {
					return err
				}
			}
		}
		for i := range stmt.Finally {
			if err := b.recordStatement(stmt.Finally[i], fmt.Sprintf("%s.finally[%d]", path, i)); err != nil {
				return err
			}
		}
	}
	return nil
}

func (b *sourceMapBuilder) findStatementOffset(id, kind string) (int, error) {
	pattern := regexp.MustCompile(`"id"\s*:\s*"` + regexp.QuoteMeta(id) + `"`)
	matches := pattern.FindAllIndex(b.source, -1)
	for _, index := range matches {
		start, end, ok := enclosingJSONObject(b.source, index[0])
		if !ok {
			continue
		}
		var candidate struct {
			ID   string `json:"id"`
			Kind string `json:"kind"`
		}
		if err := json.Unmarshal(b.source[start:end], &candidate); err != nil {
			continue
		}
		if candidate.ID == id && candidate.Kind == kind {
			return index[0], nil
		}
	}
	return 0, fmt.Errorf("statement %q not found in source", id)
}

func enclosingJSONObject(source []byte, offset int) (int, int, bool) {
	start := -1
	for i := offset; i >= 0; i-- {
		if source[i] == '{' {
			start = i
			break
		}
	}
	if start < 0 {
		return 0, 0, false
	}

	end, ok := matchingObjectEnd(source, start)
	if !ok {
		return 0, 0, false
	}
	return start, end, true
}

func matchingObjectEnd(source []byte, start int) (int, bool) {
	depth := 0
	inString := false
	escaped := false
	for i := start; i < len(source); i++ {
		ch := source[i]
		if inString {
			if escaped {
				escaped = false
				continue
			}
			if ch == '\\' {
				escaped = true
				continue
			}
			if ch == '"' {
				inString = false
			}
			continue
		}

		switch ch {
		case '"':
			inString = true
		case '{':
			depth++
		case '}':
			depth--
			if depth == 0 {
				return i + 1, true
			}
		}
	}
	return 0, false
}

func offsetToLineColumn(source []byte, offset int) (int, int) {
	if offset < 0 {
		return 1, 1
	}
	line, column := 1, 1
	for i := 0; i < offset && i < len(source); i++ {
		if source[i] == '\n' {
			line++
			column = 1
			continue
		}
		column++
	}
	return line, column
}

func (m *SourceMap) String() string {
	var b strings.Builder
	fmt.Fprintf(&b, "statements=%d lines=%d", len(m.byStatementID), len(m.byLine))
	return b.String()
}
