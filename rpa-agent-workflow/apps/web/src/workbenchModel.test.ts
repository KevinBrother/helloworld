import { describe, expect, it } from "vitest";
import sampleDocument from "../../../output/calculator-ui-node.json";
import {
  buildWorkbenchModel,
  getNodeIoLabel,
  getResolvedFieldValue,
  getSourceOptions,
  type WorkbenchField,
} from "./workbenchModel";
import type { UIDocument } from "./types";

const model = buildWorkbenchModel(sampleDocument as UIDocument);

describe("workbench model", () => {
  it("uses workflow-specific labels for start, normal, and return nodes", () => {
    expect(getNodeIoLabel(model.nodes[0])).toEqual(["3 workflow inputs"]);
    expect(getNodeIoLabel(model.nodes.find((node) => node.id === "branch_by_threshold")!)).toEqual([
      "1 input",
      "1 output",
    ]);
    expect(getNodeIoLabel(model.nodes.find((node) => node.id === "return_result")!)).toEqual(["1 workflow output"]);
  });

  it("filters source choices by expected field type", () => {
    const calculateNode = model.nodes.find((node) => node.id === "calculate_large_value")!;
    const leftField = calculateNode.inputs.find((field) => field.key === "left")!;
    const operatorField = calculateNode.inputs.find((field) => field.key === "operator")!;

    expect(getSourceOptions(model.nodes, calculateNode.id, leftField).map((source) => source.id)).toEqual([
      "input.left",
      "input.right",
    ]);
    expect(getSourceOptions(model.nodes, calculateNode.id, operatorField).map((source) => source.id)).toEqual([
      "input.operator",
    ]);
  });

  it("displays resolved values instead of internal reference ids", () => {
    const field: WorkbenchField = {
      key: "left",
      label: "left",
      type: "number",
      control: "reference",
      path: "$.body.statements[0].then[0].inputs.left",
      value: { kind: "ref", ref: "input.left" },
    };

    expect(getResolvedFieldValue(field, model.sourcesById)).toBe("12");
  });
});
