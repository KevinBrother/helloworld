import type { WorkbenchField, WorkbenchNode } from "./workbenchModel";

export type RunInputValidation = {
  valid: boolean;
  errors: Record<string, string>;
  inputs: Record<string, unknown>;
};

export type WorkbenchNodeInputValidation = {
  valid: boolean;
  errorsByNodeId: Record<string, Record<string, string>>;
  target: { nodeId: string; fieldKey: string } | null;
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

export function validateWorkbenchNodeInputs(nodes: WorkbenchNode[], availableSources: Map<string, unknown> | undefined = new Map()): WorkbenchNodeInputValidation {
  const errorsByNodeId: Record<string, Record<string, string>> = {};
  let target: WorkbenchNodeInputValidation["target"] = null;

  for (const node of nodes) {
    for (const field of [...node.inputs, ...node.outputs]) {
      if (field.readonly) continue;
      const ref = expressionRef(field.value);
      if (ref) {
        if (!availableSources?.has(ref)) {
          const error = `引用不可用：${ref}`;
          errorsByNodeId[node.id] = {
            ...(errorsByNodeId[node.id] ?? {}),
            [field.key]: error,
          };
          target ??= { nodeId: node.id, fieldKey: field.key };
        }
        continue;
      }
      if (node.kind !== "callBlock" || !node.inputs.includes(field) || field.optional) continue;
      const error = validateRequiredField(field);
      if (!error) continue;
      errorsByNodeId[node.id] = {
        ...(errorsByNodeId[node.id] ?? {}),
        [field.key]: error,
      };
      target ??= { nodeId: node.id, fieldKey: field.key };
    }
  }

  return {
    valid: Object.keys(errorsByNodeId).length === 0,
    errorsByNodeId,
    target,
  };
}

function validateRequiredField(field: WorkbenchField) {
  const value = literalValue(field.value);
  const normalized = typeof value === "string" ? value.trim() : value;
  if (normalized === "" || normalized === null || normalized === undefined) return "必填";
  if (field.type === "number") {
    const parsed = typeof normalized === "number" ? normalized : Number(normalized);
    if (!Number.isFinite(parsed)) return "必须是数字";
  }
  if (field.type === "boolean") {
    if (typeof normalized === "boolean" || normalized === "true" || normalized === "false") return null;
    return "必须是 true 或 false";
  }
  return null;
}

function literalValue(value: unknown) {
  if (isRecord(value) && value.kind === "literal") {
    return value.value;
  }
  return value;
}

function expressionRef(value: unknown) {
  if (isRecord(value) && value.kind === "ref" && typeof value.ref === "string") {
    return value.ref;
  }
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
