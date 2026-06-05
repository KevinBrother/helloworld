import type { WorkbenchField } from "./workbenchModel";

export type RunInputValidation = {
  valid: boolean;
  errors: Record<string, string>;
  inputs: Record<string, unknown>;
};

export function validateWorkflowRunInputs(fields: WorkbenchField[] | undefined): RunInputValidation {
  const errors: Record<string, string> = {};
  const inputs: Record<string, unknown> = {};

  for (const field of fields ?? []) {
    const value = literalValue(field.value);
    const normalized = typeof value === "string" ? value.trim() : value;

    if (normalized === "" || normalized === null || normalized === undefined) {
      errors[field.key] = "必填";
      continue;
    }

    if (field.type === "number") {
      const parsed = typeof normalized === "number" ? normalized : Number(normalized);
      if (!Number.isFinite(parsed)) {
        errors[field.key] = "必须是数字";
        continue;
      }
      inputs[field.key] = parsed;
      continue;
    }

    if (field.type === "boolean") {
      if (typeof normalized === "boolean") {
        inputs[field.key] = normalized;
        continue;
      }
      if (normalized === "true" || normalized === "false") {
        inputs[field.key] = normalized === "true";
        continue;
      }
      errors[field.key] = "必须是 true 或 false";
      continue;
    }

    inputs[field.key] = normalized;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    inputs,
  };
}

function literalValue(value: unknown) {
  if (isRecord(value) && value.kind === "literal") {
    return value.value;
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
