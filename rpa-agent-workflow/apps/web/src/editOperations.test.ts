import { describe, expect, it } from "vitest";
import { buildDeleteNodeOperation, buildInsertBranchOperation, buildInsertNodeOperation, buildUpdateWorkflowPortsOperation } from "./editOperations";
import type { InsertAnchor, WorkbenchNode } from "./workbenchModel";

const actor = {
  id: "local-user",
  name: "Local Editor",
  kind: "human",
};

describe("edit operation builders", () => {
  it("builds insertNode for action blocks", () => {
    const anchor: InsertAnchor = {
      afterNodeId: "first",
      beforeNodeId: "second",
      containerNodeId: "root",
    };

    expect(buildInsertNodeOperation("op-1", actor, anchor, { kind: "callBlock", block: "core.log" })).toEqual({
      schemaVersion: "1.0.0",
      operationId: "op-1",
      type: "insertNode",
      payload: {
        anchor,
        node: { kind: "callBlock", block: "core.log" },
      },
      actor,
    });
  });

  it("builds insertNode for condition and parallel nodes", () => {
    const anchor: InsertAnchor = { afterNodeId: "first", beforeNodeId: "second" };

    expect(buildInsertNodeOperation("op-if", actor, anchor, { kind: "if", branchCount: 2 }).payload?.node).toEqual({
      kind: "if",
      branchCount: 2,
    });
    expect(buildInsertNodeOperation("op-parallel", actor, anchor, { kind: "parallel", branchCount: 3 }).payload?.node).toEqual({
      kind: "parallel",
      branchCount: 3,
    });
  });

  it("builds insertNode with branch-local anchors", () => {
    const anchor: InsertAnchor = {
      containerNodeId: "choose_path",
      branchId: "condition_1",
      position: "branchStart",
    };

    expect(buildInsertNodeOperation("op-branch-node", actor, anchor, { kind: "callBlock", block: "core.log" })).toEqual({
      schemaVersion: "1.0.0",
      operationId: "op-branch-node",
      type: "insertNode",
      payload: {
        anchor,
        node: { kind: "callBlock", block: "core.log" },
      },
      actor,
    });
  });

  it("builds insertBranch for control-flow nodes", () => {
    expect(buildInsertBranchOperation("op-branch", actor, "choose_path", "condition")).toEqual({
      schemaVersion: "1.0.0",
      operationId: "op-branch",
      type: "insertBranch",
      targetNodeId: "choose_path",
      payload: {
        nodeId: "choose_path",
        branchKind: "condition",
      },
      actor,
    });
  });

  it("builds deleteNode for the selected node", () => {
    const node = {
      id: "calculate",
      deletable: true,
    } as WorkbenchNode;

    expect(buildDeleteNodeOperation("delete-1", actor, node)).toEqual({
      schemaVersion: "1.0.0",
      operationId: "delete-1",
      type: "deleteNode",
      targetNodeId: "calculate",
      payload: { nodeId: "calculate" },
      actor,
    });
  });

  it("builds updateField for workflow port declarations", () => {
    expect(
      buildUpdateWorkflowPortsOperation("ports-1", actor, "root", "inputs", [
        { name: "dir", type: { name: "string" } },
        { name: "recursive", type: { name: "boolean" } },
      ]),
    ).toEqual({
      schemaVersion: "1.0.0",
      operationId: "ports-1",
      type: "updateField",
      targetNodeId: "root",
      path: "$.inputs",
      payload: {
        value: [
          { name: "dir", type: { name: "string" } },
          { name: "recursive", type: { name: "boolean" } },
        ],
      },
      actor,
    });
  });
});
