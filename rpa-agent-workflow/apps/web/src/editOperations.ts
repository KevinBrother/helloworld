import type { EditOperation } from "./types";
import type { InsertAnchor, WorkbenchNode } from "./workbenchModel";

type Actor = NonNullable<EditOperation["actor"]>;

export type InsertNodeSpec =
  | {
      kind: "callBlock";
      block: string;
    }
  | {
      kind: "if" | "parallel";
      branchCount: number;
    };

export function buildInsertNodeOperation(operationId: string, actor: Actor, anchor: InsertAnchor, node: InsertNodeSpec): EditOperation {
  return {
    schemaVersion: "1.0.0",
    operationId,
    type: "insertNode",
    payload: {
      anchor,
      node,
    },
    actor,
  };
}

export function buildDeleteNodeOperation(operationId: string, actor: Actor, node: WorkbenchNode): EditOperation {
  return {
    schemaVersion: "1.0.0",
    operationId,
    type: "deleteNode",
    targetNodeId: node.id,
    payload: {
      nodeId: node.id,
    },
    actor,
  };
}

export function buildUpdateWorkflowPortsOperation(
  operationId: string,
  actor: Actor,
  targetNodeId: string,
  direction: "inputs" | "outputs",
  ports: Array<{ name: string; type: { name: string } }>,
): EditOperation {
  return {
    schemaVersion: "1.0.0",
    operationId,
    type: "updateField",
    targetNodeId,
    path: `$.${direction}`,
    payload: {
      value: ports,
    },
    actor,
  };
}
