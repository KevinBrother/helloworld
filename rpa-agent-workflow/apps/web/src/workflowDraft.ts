import type { EditOperation, UIDocument } from "./types";

const DRAFT_KEY_PREFIX = "rpawf.workflowDraft:";

export type WorkflowDraft = {
  source: string;
  ui: UIDocument;
  selectedNodeId: string;
  pendingOperations: EditOperation[];
};

export function saveWorkflowDraft(storage: Storage, draft: WorkflowDraft) {
  storage.setItem(draftKey(draft.source), JSON.stringify(draft));
}

export function loadWorkflowDraft(storage: Storage, source: string): WorkflowDraft | null {
  const raw = storage.getItem(draftKey(source));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isWorkflowDraft(parsed, source)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearWorkflowDraft(storage: Storage, source: string) {
  storage.removeItem(draftKey(source));
}

function draftKey(source: string) {
  return `${DRAFT_KEY_PREFIX}${encodeURIComponent(source)}`;
}

function isWorkflowDraft(value: unknown, source: string): value is WorkflowDraft {
  if (!isRecord(value)) return false;
  if (value.source !== source || typeof value.selectedNodeId !== "string") return false;
  if (!Array.isArray(value.pendingOperations)) return false;
  return isUIDocument(value.ui);
}

function isUIDocument(value: unknown): value is UIDocument {
  return isRecord(value) && typeof value.schemaVersion === "string" && typeof value.workflowId === "string" && isRecord(value.root);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
