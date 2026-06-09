import { describe, expect, it } from "vitest";
import { buildWorkbenchModel } from "./workbenchModel";
import { diagnosticErrorsForNode, findDiagnosticTarget } from "./diagnosticTargets";
import type { Diagnostic, UIDocument } from "./types";

const diagnostics: Diagnostic[] = [
  {
    severity: "error",
    code: "TYPE_MISMATCH",
    message: "字段类型不匹配：需要数字（$.body.statements[0].inputs.durationMs）",
    path: "$.body.statements[0].inputs.durationMs",
  },
];

describe("diagnostic targets", () => {
  it("finds the node and field targeted by a compiler diagnostic path", () => {
    const model = buildWorkbenchModel(delayDocument());

    expect(findDiagnosticTarget(model, diagnostics)).toEqual({
      fieldKey: "durationMs",
      nodeId: "wait_before_list",
    });
  });

  it("builds field errors for the selected node", () => {
    const model = buildWorkbenchModel(delayDocument());

    expect(diagnosticErrorsForNode(model, "wait_before_list", diagnostics)).toEqual({
      durationMs: "字段类型不匹配：需要数字（$.body.statements[0].inputs.durationMs）",
    });
    expect(diagnosticErrorsForNode(model, "root", diagnostics)).toEqual({});
  });
});

function delayDocument(): UIDocument {
  return {
    schemaVersion: "1.0.0",
    workflowId: "delay_workflow",
    root: {
      id: "root",
      kind: "sequence",
      label: "Start",
      children: [
        {
          id: "wait_before_list",
          kind: "callBlock",
          label: "core.delay",
          path: "$.body.statements[0]",
          inspector: [
            {
              path: "$.body.statements[0].inputs.durationMs",
              label: "Input durationMs",
              control: "expression",
              value: { kind: "literal", value: "" },
            },
          ],
        },
      ],
    },
  };
}
