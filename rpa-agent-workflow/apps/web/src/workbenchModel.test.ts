import { describe, expect, it } from "vitest";
import sampleDocument from "../../../output/calculator-ui-node.json";
import fsDocument from "../../../output/fs-ui-node.json";
import {
  buildCanvasLayout,
  buildWorkbenchModel,
  buildCanvasTopology,
  getNodeIoLabel,
  getResolvedFieldValue,
  getSourceOptions,
  type WorkbenchField,
} from "./workbenchModel";
import type { UIDocument } from "./types";

const model = buildWorkbenchModel(sampleDocument as UIDocument);
const fsModel = buildWorkbenchModel(fsDocument as UIDocument);

describe("workbench model", () => {
  it("uses workflow-specific labels for start, normal, and return nodes", () => {
    expect(getNodeIoLabel(model.nodes[0])).toEqual(["3 个流程输入"]);
    expect(getNodeIoLabel(model.nodes.find((node) => node.id === "branch_by_threshold")!)).toEqual([
      "3 个输入",
      "1 个输出",
    ]);
    expect(getNodeIoLabel(model.nodes.find((node) => node.id === "return_result")!)).toEqual(["1 个流程输出"]);
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

  it("uses real block catalog entries when provided", () => {
    const catalogModel = buildWorkbenchModel(sampleDocument as UIDocument, [
      {
        id: "core.log",
        namespace: "core",
        name: "log",
        version: "1.0.0",
        inputs: [{ name: "message", type: { name: "string" } }],
        outputs: [],
      },
      {
        id: "math.calculate",
        namespace: "math",
        name: "calculate",
        version: "1.0.0",
        inputs: [
          { name: "left", type: { name: "number" } },
          { name: "operator", type: { name: "string" } },
          { name: "right", type: { name: "number" } },
        ],
        outputs: [{ name: "result", type: { name: "number" } }],
      },
    ]);

    expect(catalogModel.blockOptions.map((block) => block.key)).toEqual(["core.log", "math.calculate"]);
    expect(catalogModel.blockOptions.find((block) => block.key === "math.calculate")).toEqual(
      expect.objectContaining({
        category: "math",
        detail: "3 个输入 / 1 个输出",
        instances: 2,
      }),
    );
  });

  it("keeps the block library empty when the service catalog is unavailable", () => {
    const offlineModel = buildWorkbenchModel(sampleDocument as UIDocument);

    expect(offlineModel.blockOptions).toEqual([]);
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

  it("lays out plain sequence workflows as connected vertical steps", () => {
    const layout = buildCanvasLayout(fsModel);

    expect(layout.nodes.map((node) => node.node.id)).toEqual(["root", "list_input_dir", "write_summary", "return_result"]);
    expect(layout.edges.map((edge) => `${edge.from}->${edge.to}`)).toEqual([
      "root->list_input_dir",
      "list_input_dir->write_summary",
      "write_summary->return_result",
    ]);
    expect(layout.nodes.map((node) => node.x)).toEqual([280, 280, 280, 280]);
    expect(layout.nodes.map((node) => node.y)).toEqual([18, 190, 362, 534]);
    expect(layout.width).toBe(560);
    expect(layout.height).toBeGreaterThanOrEqual(680);
    expect(layout.edges[0].anchor).toEqual({
      afterNodeId: "root",
      beforeNodeId: "list_input_dir",
      containerNodeId: "root",
    });
  });

  it("preserves readable branch lanes for conditional workflows", () => {
    const layout = buildCanvasLayout(model);

    expect(layout.edges.map((edge) => `${edge.from}->${edge.to}`)).toEqual([
      "root->branch_by_threshold",
      "branch_by_threshold->calculate_large_value",
      "branch_by_threshold->calculate_small_value",
      "calculate_large_value->return_result",
      "calculate_small_value->return_result",
    ]);
    expect(layout.nodes.find((node) => node.node.id === "calculate_large_value")?.x).toBeLessThan(
      layout.nodes.find((node) => node.node.id === "branch_by_threshold")!.x,
    );
    expect(layout.nodes.find((node) => node.node.id === "calculate_small_value")?.x).toBeGreaterThan(
      layout.nodes.find((node) => node.node.id === "branch_by_threshold")!.x,
    );
  });

  it("marks protected and editable nodes for explicit deletion", () => {
    expect(model.nodes.find((node) => node.id === "root")).toEqual(
      expect.objectContaining({ deletable: false, deleteMessage: "开始节点不能删除" }),
    );
    expect(model.nodes.find((node) => node.id === "return_result")).toEqual(
      expect.objectContaining({ deletable: false, deleteMessage: "返回节点不能删除" }),
    );
    expect(model.nodes.find((node) => node.id === "calculate_large_value")).toEqual(
      expect.objectContaining({ deletable: true, hasNestedChildren: false }),
    );
    expect(model.nodes.find((node) => node.id === "branch_by_threshold")).toEqual(
      expect.objectContaining({ deletable: true, hasNestedChildren: true }),
    );
  });
});
