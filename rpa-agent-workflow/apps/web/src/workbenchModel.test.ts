import { describe, expect, it } from "vitest";
import sampleDocument from "../../../output/calculator-ui-node.json";
import {
  buildWorkbenchModel,
  buildCanvasTopology,
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
      "3 inputs",
      "1 output",
    ]);
    expect(getNodeIoLabel(model.nodes.find((node) => node.id === "return_result")!)).toEqual(["1 workflow output"]);
  });

  it("models if condition as left, operator, and right inputs", () => {
    const branchNode = model.nodes.find((node) => node.id === "branch_by_threshold")!;

    expect(branchNode.inputs).toEqual([
      expect.objectContaining({ key: "left", type: "number", control: "reference", value: { kind: "ref", ref: "input.left" } }),
      expect.objectContaining({ key: "operator", type: "string", control: "input", value: { kind: "literal", value: ">" }, options: [">", ">=", "<", "<=", "=="] }),
      expect.objectContaining({ key: "right", type: "number", control: "input", value: { kind: "literal", value: 10 } }),
    ]);
  });

  it("keeps call block operator choices arithmetic-only", () => {
    const calculateNode = model.nodes.find((node) => node.id === "calculate_large_value")!;
    const operatorField = calculateNode.inputs.find((field) => field.key === "operator")!;

    expect(operatorField.options).toEqual(["+", "-", "*", "/"]);
  });

  it("keeps compatible operator fields bindable even when they expose manual choices", () => {
    const calculateNode = model.nodes.find((node) => node.id === "calculate_large_value")!;
    const operatorField = calculateNode.inputs.find((field) => field.key === "operator")!;
    const branchNode = model.nodes.find((node) => node.id === "branch_by_threshold")!;
    const conditionOperator = branchNode.inputs.find((field) => field.key === "operator")!;

    expect(operatorField.control).toBe("reference");
    expect(getSourceOptions(model.nodes, calculateNode.id, operatorField).map((source) => source.id)).toEqual(["input.operator"]);
    expect(conditionOperator.control).toBe("input");
    expect(getSourceOptions(model.nodes, branchNode.id, conditionOperator).map((source) => source.id)).toEqual([]);
  });

  it("uses edited workflow input values instead of falling back to samples", () => {
    const editedDocument = structuredClone(sampleDocument) as UIDocument;
    const operatorPort = editedDocument.root.inspector!.find((field) => field.path === "$.inputs.operator")!;
    operatorPort.value = { kind: "literal", value: "-" };

    const editedModel = buildWorkbenchModel(editedDocument);
    const startNode = editedModel.nodes.find((node) => node.id === "root")!;
    const operatorField = startNode.inputs.find((field) => field.key === "operator")!;

    expect(getResolvedFieldValue(operatorField, editedModel.sourcesById)).toBe("-");
    expect(editedModel.sourcesById.get("input.operator")?.displayValue).toBe("-");
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

  it("models block outputs as declarations without editable values", () => {
    const calculateNode = model.nodes.find((node) => node.id === "calculate_large_value")!;

    expect(calculateNode.outputs).toEqual([
      expect.objectContaining({
        key: "result",
        label: "result",
        type: "number",
        control: "readonly",
        readonly: true,
      }),
    ]);
  });

  it("models return outputs as declarations without resolved values", () => {
    const returnNode = model.nodes.find((node) => node.id === "return_result")!;

    expect(returnNode.outputs).toEqual([
      expect.objectContaining({
        key: "result",
        label: "result",
        type: "number",
        control: "readonly",
        readonly: true,
        value: undefined,
      }),
    ]);
  });

  it("builds a readable primary canvas topology", () => {
    const topology = buildCanvasTopology(model);

    expect(topology.start?.id).toBe("root");
    expect(topology.decision?.id).toBe("branch_by_threshold");
    expect(topology.thenNodes.map((node) => node.id)).toEqual(["calculate_large_value"]);
    expect(topology.elseNodes.map((node) => node.id)).toEqual(["calculate_small_value"]);
    expect(topology.returnNode?.id).toBe("return_result");
  });
});
