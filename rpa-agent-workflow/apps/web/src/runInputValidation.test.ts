import { describe, expect, it } from "vitest";
import { validateWorkbenchNodeInputs, validateWorkflowRunInputs } from "./runInputValidation";
import type { WorkbenchField, WorkbenchNode } from "./workbenchModel";

const fields: WorkbenchField[] = [
  field("left", "number", 12),
  field("operator", "string", "+"),
  field("right", "number", 7),
];

describe("validateWorkflowRunInputs", () => {
  it("rejects empty required workflow inputs", () => {
    const result = validateWorkflowRunInputs([field("left", "number", "")]);

    expect(result.valid).toBe(false);
    expect(result.errors.left).toBe("必填");
  });

  it("rejects manual values that do not match the workflow input type", () => {
    const result = validateWorkflowRunInputs([field("left", "number", "abc"), field("enabled", "boolean", "maybe")]);

    expect(result.valid).toBe(false);
    expect(result.errors.left).toBe("必须是数字");
    expect(result.errors.enabled).toBe("必须是 true 或 false");
  });

  it("returns parsed run inputs for valid values", () => {
    const result = validateWorkflowRunInputs(fields);

    expect(result).toEqual({
      valid: true,
      errors: {},
      inputs: { left: 12, operator: "+", right: 7 },
    });
  });
});

describe("validateWorkbenchNodeInputs", () => {
  it("rejects empty required block inputs before runtime execution", () => {
    const result = validateWorkbenchNodeInputs([
      node("fs_list", [
        field("path", "path", "", { path: "$.body.statements[0].inputs.path" }),
        field("recursive", "boolean", false, { optional: true, path: "$.body.statements[0].inputs.recursive" }),
      ]),
    ]);

    expect(result.valid).toBe(false);
    expect(result.target).toEqual({ nodeId: "fs_list", fieldKey: "path" });
    expect(result.errorsByNodeId).toEqual({
      fs_list: {
        path: "必填",
      },
    });
  });

  it("allows empty optional block inputs", () => {
    const result = validateWorkbenchNodeInputs([node("fs_list", [field("recursive", "boolean", "", { optional: true })])]);

    expect(result).toEqual({
      valid: true,
      errorsByNodeId: {},
      target: null,
    });
  });
});

function field(
  key: string,
  type: WorkbenchField["type"],
  value: unknown,
  options: { optional?: boolean; path?: string } = {},
): WorkbenchField {
  return {
    key,
    label: key,
    type,
    control: "input",
    path: options.path ?? `$.inputs.${key}`,
    value: { kind: "literal", value },
    optional: options.optional,
  };
}

function node(id: string, inputs: WorkbenchField[]): WorkbenchNode {
  return {
    id,
    kind: "callBlock",
    label: id,
    order: 1,
    raw: { id, kind: "callBlock" },
    inputs,
    outputs: [],
    inputPorts: [],
    outputPorts: [],
    inputRows: [],
    outputRows: [],
    allowCustomInput: false,
    allowCustomOutput: false,
    deletable: true,
    deleteMessage: "",
    hasNestedChildren: false,
  };
}
