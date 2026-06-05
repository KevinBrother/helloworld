import { describe, expect, it } from "vitest";
import sampleDocument from "../../../output/calculator-ui-node.json";
import { findInvalidConditionOperatorRepairs } from "./runReadiness";
import { buildWorkbenchModel } from "./workbenchModel";
import type { UIDocument } from "./types";

describe("findInvalidConditionOperatorRepairs", () => {
  it("repairs an if condition operator polluted by a calculator operator input", () => {
    const document = structuredClone(sampleDocument) as UIDocument;
    const condition = document.root.children![0].inspector!.find((field) => field.label === "Condition")!;
    condition.value = {
      ...(condition.value as Record<string, unknown>),
      operator: { kind: "ref", ref: "input.operator" },
    };

    const repairs = findInvalidConditionOperatorRepairs(buildWorkbenchModel(document));

    expect(repairs).toEqual([
      expect.objectContaining({
        fieldPath: "$.body.statements[0].condition.operator",
        nodeId: "branch_by_threshold",
        value: { kind: "literal", value: ">" },
      }),
    ]);
  });
});
