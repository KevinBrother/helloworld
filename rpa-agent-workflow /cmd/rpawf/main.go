package main

import (
	"encoding/json"
	"fmt"
	"os"

	"rpa-agent-workflow/internal/block"
	"rpa-agent-workflow/internal/compiler"
	codegenpython "rpa-agent-workflow/internal/codegen/python"
)

func main() {
	args := os.Args[1:]
	if len(args) == 0 {
		printUsage()
		return
	}

	switch args[0] {
	case "compile", "run":
		if len(args) > 1 && args[1] == "--help" {
			printUsage()
			return
		}
		if len(args) < 3 {
			printUsage()
			return
		}
		src, err := compileFile(args[1], args[2])
		if err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}
		fmt.Print(src)
	default:
		printUsage()
	}
}

func printUsage() {
	fmt.Println("Usage: rpawf <compile|run> [--help]")
}

func compileFile(astPath, blockPath string) (string, error) {
	astBytes, err := os.ReadFile(astPath)
	if err != nil {
		return "", err
	}
	blockBytes, err := os.ReadFile(blockPath)
	if err != nil {
		return "", err
	}

	blocks, err := decodeBlocks(blockBytes)
	if err != nil {
		return "", err
	}

	workflow, diags := compiler.ValidateWorkflow(astBytes, blocks)
	if len(diags) > 0 {
		return "", fmt.Errorf("%s: %s", diags[0].Code, diags[0].Message)
	}
	src, err := codegenpython.Generate(workflow, blocks)
	if err != nil {
		return "", err
	}
	return src, nil
}

func decodeBlocks(data []byte) (map[string]block.Definition, error) {
	var list []block.Definition
	if err := json.Unmarshal(data, &list); err == nil {
		return indexBlocks(list), nil
	}
	var single block.Definition
	if err := json.Unmarshal(data, &single); err != nil {
		return nil, err
	}
	return indexBlocks([]block.Definition{single}), nil
}

func indexBlocks(list []block.Definition) map[string]block.Definition {
	blocks := make(map[string]block.Definition, len(list))
	for _, blk := range list {
		blocks[blk.ID] = blk
	}
	return blocks
}
