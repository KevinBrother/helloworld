package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"

	codegenpython "rpa-agent-workflow/compiler/go/codegen/python"
	"rpa-agent-workflow/compiler/go/compiler"
	"rpa-agent-workflow/compiler/go/executor"
	"rpa-agent-workflow/compiler/go/schema"
	"rpa-agent-workflow/compiler/go/transform"
	"rpa-agent-workflow/contracts/block"
)

func main() {
	args := os.Args[1:]
	if len(args) == 0 {
		printUsage()
		return
	}

	switch args[0] {
	case "debug":
		code := runDebugCommand(args[1:], os.Stdin, os.Stdout, os.Stderr)
		if code != 0 {
			os.Exit(code)
		}
	case "exec":
		if len(args) > 1 && args[1] == "--help" {
			printUsage()
			return
		}
		if len(args) < 2 {
			printUsage()
			return
		}
		src, err := execFile(args[1], args[2:])
		if err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}
		fmt.Print(src)
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
	case "project-ui":
		if len(args) > 1 && args[1] == "--help" {
			printUsage()
			return
		}
		if len(args) < 2 {
			printUsage()
			return
		}
		src, err := projectUIFile(args[1])
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
	fmt.Println("Usage: rpawf <compile|run|exec|debug|project-ui> [--help]")
}

func compileFile(astPath, blockPath string) (string, error) {
	astBytes, err := os.ReadFile(astPath)
	if err != nil {
		return "", err
	}
	blocks, err := loadBlocks(blockPath)
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

func projectUIFile(astPath string) (string, error) {
	astBytes, err := os.ReadFile(astPath)
	if err != nil {
		return "", err
	}
	if err := schema.ValidateAstBytes(astBytes); err != nil {
		return "", err
	}
	workflow, err := schema.LoadAst(astPath)
	if err != nil {
		return "", err
	}
	doc := transform.ProjectWorkflow(*workflow)
	out, err := json.MarshalIndent(doc, "", "  ")
	if err != nil {
		return "", err
	}
	return string(out) + "\n", nil
}

func execFile(astPath string, extra []string) (string, error) {
	astBytes, err := os.ReadFile(astPath)
	if err != nil {
		return "", err
	}

	blocks := map[string]block.Definition{}
	if len(extra) > 0 {
		blocks, err = loadBlocks(extra[0])
		if err != nil {
			return "", err
		}
	}

	workflow, diags := compiler.ValidateWorkflow(astBytes, blocks)
	if len(diags) > 0 {
		return "", fmt.Errorf("%s: %s", diags[0].Code, diags[0].Message)
	}

	opts := executor.Options{
		Blocks: blocks,
	}
	if len(extra) > 1 {
		inputBytes, err := os.ReadFile(extra[1])
		if err != nil {
			return "", err
		}
		if err := json.Unmarshal(inputBytes, &opts.Inputs); err != nil {
			return "", err
		}
	}
	if len(blocks) > 0 {
		opts.Host = executor.NewPythonHost(executor.PythonHostOptions{})
	}

	result, err := executor.RunWorkflow(context.Background(), *workflow, opts)
	if err != nil {
		return "", err
	}
	out, err := json.MarshalIndent(result, "", "  ")
	if err != nil {
		return "", err
	}
	return string(out) + "\n", nil
}

func loadBlocks(path string) (map[string]block.Definition, error) {
	info, err := os.Stat(path)
	if err != nil {
		return nil, err
	}
	if !info.IsDir() {
		blockBytes, err := os.ReadFile(path)
		if err != nil {
			return nil, err
		}
		return decodeBlocks(blockBytes)
	}

	var paths []string
	if err := filepath.WalkDir(path, func(current string, entry os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if entry.IsDir() {
			return nil
		}
		if entry.Name() == "block.json" || filepath.Ext(entry.Name()) == ".json" {
			paths = append(paths, current)
		}
		return nil
	}); err != nil {
		return nil, err
	}
	sort.Strings(paths)

	blocks := map[string]block.Definition{}
	for _, manifestPath := range paths {
		blockBytes, err := os.ReadFile(manifestPath)
		if err != nil {
			return nil, err
		}
		loaded, err := decodeBlocks(blockBytes)
		if err != nil {
			return nil, fmt.Errorf("%s: %w", manifestPath, err)
		}
		for id, definition := range loaded {
			blocks[id] = definition
		}
	}
	return blocks, nil
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
