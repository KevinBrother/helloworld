import { describe, expect, it } from "vitest";
import { validateWorkflowRunInputs } from "./runInputValidation";
import type { WorkbenchField } from "./workbenchModel";

const fields: WorkbenchField[] = [
  field("left", "number", 12),
  field("operator", "string", "+"),
  field("right", "number", 7),
];

describe("validateWorkflowRunInputs", () => {
  it("rejects empty required workflow inputs", () => {
    const result = validateWorkflowRunInputs([field("left", "number", "")]);

    expect(result.valid).toBe(false);
    expect(result.errors.left).toBe("Required");
  });

  it("rejects manual values that do not match the workflow input type", () => {
    const result = validateWorkflowRunInputs([field("left", "number", "abc"), field("enabled", "boolean", "maybe")]);

    expect(result.valid).toBe(false);
    expect(result.errors.left).toBe("Must be a number");
    expect(result.errors.enabled).toBe("Must be true or false");
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

function field(key: string, type: WorkbenchField["type"], value: unknown): WorkbenchField {
  return {
    key,
    label: key,
    type,
    control: "input",
    path: `$.inputs.${key}`,
    value: { kind: "literal", value },
  };
}
