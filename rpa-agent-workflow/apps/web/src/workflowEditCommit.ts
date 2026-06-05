import type { EditOperation, EditorStateResponse } from "./types";

export type WorkflowEditCommitter = (operation: EditOperation) => Promise<EditorStateResponse>;

export async function commitPendingEditOperations(pendingOperations: EditOperation[], commit: WorkflowEditCommitter) {
  let latestState: EditorStateResponse | null = null;
  for (const operation of pendingOperations) {
    latestState = await commit(operation);
  }
  return latestState;
}
