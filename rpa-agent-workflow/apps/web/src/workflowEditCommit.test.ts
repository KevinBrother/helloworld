import { describe, expect, it } from "vitest";
import type { EditOperation, EditorStateResponse } from "./types";
import { commitPendingEditOperations } from "./workflowEditCommit";

describe("workflow edit commit", () => {
  it("commits pending edit operations in order and returns the latest server state", async () => {
    const operations = [operation("update-1"), operation("update-2")];
    const calls: string[] = [];
    const states: EditorStateResponse[] = [state("after-update-1"), state("after-update-2")];

    const latest = await commitPendingEditOperations(operations, async (edit) => {
      calls.push(edit.operationId);
      return states[calls.length - 1];
    });

    expect(calls).toEqual(["update-1", "update-2"]);
    expect(latest).toBe(states[1]);
  });

  it("does not call the workflow service when there are no pending edits", async () => {
    let calls = 0;

    const latest = await commitPendingEditOperations([], async () => {
      calls += 1;
      return state("unused");
    });

    expect(calls).toBe(0);
    expect(latest).toBeNull();
  });
});

function operation(operationId: string): EditOperation {
  return {
    schemaVersion: "1.0.0",
    operationId,
    type: "updateField",
    targetNodeId: "root",
    path: "$.inputs",
    payload: { value: [] },
  };
}

function state(workflowId: string): EditorStateResponse {
  return {
    ast: {},
    ui: {
      schemaVersion: "1.0.0",
      workflowId,
      root: {
        id: "root",
        kind: "sequence",
      },
    },
    diagnostics: [],
  };
}
