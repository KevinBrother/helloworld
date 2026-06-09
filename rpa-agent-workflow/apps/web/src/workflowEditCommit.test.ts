import { describe, expect, it } from "vitest";
import type { EditOperation, EditorStateResponse } from "./types";
import { commitPendingEditOperations, upsertPendingEditOperation } from "./workflowEditCommit";

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

  it("replaces older pending edits for the same field path with the latest value", () => {
    const first = operation("update-duration-string");
    const second = {
      ...operation("update-duration-number"),
      payload: { value: { kind: "literal", value: 1 } },
    };
    const other = {
      ...operation("update-other-field"),
      path: "$.body.statements[0].inputs.message",
    };

    const pending = upsertPendingEditOperation([first], second);
    const nextPending = upsertPendingEditOperation(pending, other);

    expect(nextPending).toHaveLength(2);
    expect(nextPending[0]).toBe(second);
    expect(nextPending[0].payload?.value).toEqual({ kind: "literal", value: 1 });
    expect(nextPending[1]).toBe(other);
  });
});

function operation(operationId: string): EditOperation {
  return {
    schemaVersion: "1.0.0",
    operationId,
    type: "updateField",
    targetNodeId: "core_delay",
    path: "$.body.statements[0].inputs.durationMs",
    payload: { value: { kind: "literal", value: "1" } },
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
