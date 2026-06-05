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

export function normalizeWorkflowDraftForServerUI(draft: WorkflowDraft, serverUI: UIDocument): WorkflowDraft {
  const pendingOperations: EditOperation[] = [];
  let ui = preserveWorkflowRunInputs(serverUI, draft.ui);

  for (const operation of draft.pendingOperations) {
    if (isWorkflowInputPath(operation.path)) {
      const key = workflowInputKey(operation.path);
      if (key) ui = updateWorkflowRunInputValue(ui, key, operation.payload?.value);
      continue;
    }
    pendingOperations.push(operation);
  }

  if (pendingOperations.length > 0) {
    ui = restoreWorkflowInputDeclarations(draft.ui, ui);
  }

  return {
    ...draft,
    pendingOperations,
    ui,
  };
}

function draftKey(source: string) {
  return `${DRAFT_KEY_PREFIX}${encodeURIComponent(source)}`;
}

function preserveWorkflowRunInputs(serverUI: UIDocument, draftUI: UIDocument): UIDocument {
  return {
    ...serverUI,
    metadata: {
      ...serverUI.metadata,
      workflowInputValues: workflowInputValues(draftUI),
    },
  };
}

function updateWorkflowRunInputValue(document: UIDocument, key: string, value: unknown): UIDocument {
  const currentValues = workflowInputValues(document);
  return {
    ...document,
    metadata: {
      ...document.metadata,
      workflowInputValues: {
        ...currentValues,
        [key]: value,
      },
    },
  };
}

function restoreWorkflowInputDeclarations(draftUI: UIDocument, serverUI: UIDocument): UIDocument {
  const serverFields = new Map((serverUI.root.inspector ?? []).filter((field) => isWorkflowInputPath(field.path)).map((field) => [field.path, field]));
  return {
    ...draftUI,
    root: {
      ...draftUI.root,
      inspector: draftUI.root.inspector?.map((field) => serverFields.get(field.path) ?? field),
    },
  };
}

function workflowInputValues(document: UIDocument) {
  const value = document.metadata?.workflowInputValues;
  return isRecord(value) ? value : {};
}

function isWorkflowInputPath(path: string | undefined): path is string {
  return typeof path === "string" && path.startsWith("$.inputs.");
}

function workflowInputKey(path: string | undefined) {
  if (!isWorkflowInputPath(path)) return "";
  return path.slice("$.inputs.".length);
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
