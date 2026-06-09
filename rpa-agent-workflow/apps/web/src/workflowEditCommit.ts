import type { EditOperation, EditorStateResponse } from "./types";

export type WorkflowEditCommitter = (operation: EditOperation) => Promise<EditorStateResponse>;

export async function commitPendingEditOperations(pendingOperations: EditOperation[], commit: WorkflowEditCommitter) {
  let latestState: EditorStateResponse | null = null;
  for (const operation of pendingOperations) {
    latestState = await commit(operation);
  }
  return latestState;
}

export function upsertPendingEditOperation(pendingOperations: EditOperation[], nextOperation: EditOperation) {
  if (nextOperation.type !== "updateField" || !nextOperation.targetNodeId || !nextOperation.path) {
    return [...pendingOperations, nextOperation];
  }

  const existingIndex = pendingOperations.findIndex(
    (operation) =>
      operation.type === "updateField" &&
      operation.targetNodeId === nextOperation.targetNodeId &&
      operation.path === nextOperation.path,
  );
  if (existingIndex < 0) {
    return [...pendingOperations, nextOperation];
  }

  return pendingOperations.map((operation, index) => (index === existingIndex ? nextOperation : operation));
}
