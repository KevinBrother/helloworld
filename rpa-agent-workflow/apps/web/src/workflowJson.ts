import type { UIDocument } from "./types";

export function parseUIDocumentJSON(raw: string): UIDocument {
  const parsed = JSON.parse(raw) as unknown;
  if (!isUIDocument(parsed)) {
    if (isASTDocument(parsed)) {
      throw new Error("请选择 UI Node JSON；AST JSON 需要通过 rpawf serve 或 project-ui 投影后加载。");
    }
    throw new Error("请选择 UI Node JSON。");
  }
  return parsed;
}

function isUIDocument(value: unknown): value is UIDocument {
  if (!isRecord(value) || typeof value.workflowId !== "string" || !isRecord(value.root)) {
    return false;
  }
  return typeof value.root.id === "string" && typeof value.root.kind === "string";
}

function isASTDocument(value: unknown) {
  return isRecord(value) && isRecord(value.workflow) && isRecord(value.body) && typeof value.schemaVersion === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
