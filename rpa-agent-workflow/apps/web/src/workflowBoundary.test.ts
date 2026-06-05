import { describe, expect, it } from "vitest";
import { updateWorkflowPortsInDocument } from "./workflowBoundary";
import type { UIDocument } from "./types";
import type { WorkbenchPort } from "./workbenchModel";

describe("workflow boundary document updates", () => {
  it("adds return expression fields when adding workflow outputs locally", () => {
    const document = returnDocument();
    const nextPorts: WorkbenchPort[] = [
      port("count", "number", "$.outputs.count"),
      port("bytes", "number", "$.outputs.bytes"),
    ];

    const next = updateWorkflowPortsInDocument(document, "outputs", nextPorts, "return_result", [port("count", "number", "$.outputs.count")]);
    const returnNode = next.root.children![0];

    expect(returnNode.inspector?.map((field) => field.path)).toContain("$.outputs.bytes");
    expect(returnNode.inspector?.map((field) => field.path)).toContain("$.body.statements[0].returns.bytes");
    expect(returnNode.inspector?.find((field) => field.path === "$.body.statements[0].returns.bytes")?.value).toEqual({
      kind: "literal",
      value: "",
    });
  });

  it("renames return expression fields by output position", () => {
    const document = returnDocument();
    const next = updateWorkflowPortsInDocument(
      document,
      "outputs",
      [port("total", "number", "$.outputs.count")],
      "return_result",
      [port("count", "number", "$.outputs.count")],
    );
    const paths = next.root.children![0].inspector?.map((field) => field.path) ?? [];

    expect(paths).toContain("$.outputs.total");
    expect(paths).toContain("$.body.statements[0].returns.total");
    expect(paths).not.toContain("$.body.statements[0].returns.count");
  });
});

function returnDocument(): UIDocument {
  return {
    schemaVersion: "1.0.0",
    workflowId: "wf",
    root: {
      id: "root",
      kind: "sequence",
      capabilities: emptyCapabilities(),
      children: [
        {
          id: "return_result",
          kind: "return",
          path: "$.body.statements[0]",
          capabilities: emptyCapabilities(),
          inspector: [
            { path: "$.outputs.count", label: "Output count", control: "port", readonly: true, value: { name: "count", type: { name: "number" } } },
            { path: "$.body.statements[0].returns.count", label: "Return count", control: "expression", value: { kind: "ref", ref: "node.list.count" } },
          ],
        },
      ],
    },
  };
}

function port(name: string, type: string, path: string): WorkbenchPort {
  return { key: name, label: name, type: type as WorkbenchPort["type"], path, value: { name, type: { name: type } } };
}

function emptyCapabilities() {
  return {
    toggleCollapsed: { enabled: false },
    updateField: { enabled: false },
    insertNode: { enabled: false },
    deleteNode: { enabled: false },
    moveStatement: { enabled: false },
    duplicateNode: { enabled: false },
    replaceSubtree: { enabled: false },
  };
}
