import type { Diagnostic } from "./types";
import type { WorkbenchModel, WorkbenchNode } from "./workbenchModel";

export type DiagnosticTarget = {
  nodeId: string;
  fieldKey: string;
};

export function findDiagnosticTarget(model: WorkbenchModel, diagnostics: Diagnostic[]): DiagnosticTarget | null {
  for (const diagnostic of diagnostics) {
    for (const node of model.nodes) {
      const field = fieldForDiagnostic(node, diagnostic);
      if (field) {
        return {
          fieldKey: field.key,
          nodeId: node.id,
        };
      }
    }
  }
  return null;
}

export function diagnosticErrorsForNode(model: WorkbenchModel, nodeId: string, diagnostics: Diagnostic[]) {
  const node = model.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) return {};

  const errors: Record<string, string> = {};
  for (const diagnostic of diagnostics) {
    const field = fieldForDiagnostic(node, diagnostic);
    if (field) {
      errors[field.key] = diagnostic.message ?? "字段配置有误";
    }
  }
  return errors;
}

function fieldForDiagnostic(node: WorkbenchNode, diagnostic: Diagnostic) {
  const path = diagnostic.path;
  if (!path) return null;
  return [...node.inputs, ...node.outputs].find((field) => path === field.path || path.startsWith(`${field.path}.`)) ?? null;
}
