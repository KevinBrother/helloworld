package schema

import (
	"encoding/json"
	"fmt"
	"os"

	"rpa-agent-workflow/contracts/ast"
	"rpa-agent-workflow/contracts/block"
)

func LoadAst(path string) (*ast.Workflow, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var workflow ast.Workflow
	if err := json.Unmarshal(data, &workflow); err != nil {
		return nil, err
	}
	return &workflow, nil
}

func LoadBlock(path string) (*block.Definition, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var definition block.Definition
	if err := json.Unmarshal(data, &definition); err != nil {
		return nil, err
	}
	return &definition, nil
}

func ValidateAstBytes(data []byte) error {
	var workflow ast.Workflow
	if err := json.Unmarshal(data, &workflow); err != nil {
		return fmt.Errorf("invalid ast json: %w", err)
	}
	if workflow.SchemaVersion == "" {
		return fmt.Errorf("missing schemaVersion")
	}
	if workflow.Workflow.ID == "" {
		return fmt.Errorf("missing workflow.id")
	}
	if workflow.Body.ID == "" {
		return fmt.Errorf("missing body.id")
	}
	if workflow.Body.Kind == "" {
		return fmt.Errorf("missing body.kind")
	}
	return nil
}

func ValidateBlockBytes(data []byte) error {
	var definition block.Definition
	if err := json.Unmarshal(data, &definition); err != nil {
		return fmt.Errorf("invalid block json: %w", err)
	}
	if definition.SchemaVersion == "" {
		return fmt.Errorf("missing schemaVersion")
	}
	if definition.ID == "" {
		return fmt.Errorf("missing id")
	}
	if definition.Runtime.Target == "" {
		return fmt.Errorf("missing runtime.target")
	}
	return nil
}
