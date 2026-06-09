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

const model = buildWorkbenchModel(withCalculatorOutputMetadata(sampleDocument as UIDocument));
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

  it("separates editable workflow port declarations from run input values", () => {
    const startNode = model.nodes[0];
    const returnNode = model.nodes.find((node) => node.id === "return_result")!;

    expect(startNode.inputPorts.map((field) => `${field.key}:${field.type}`)).toEqual(["left:number", "operator:string", "right:number"]);
    expect(startNode.inputs.map((field) => field.key)).toEqual(["left", "operator", "right"]);
    expect(returnNode.outputPorts.map((field) => `${field.key}:${field.type}`)).toEqual(["result:number"]);
  });

  it("projects workflow inputs into unified parameter rows", () => {
    const startNode = model.nodes.find((node) => node.id === "root")!;

    expect(startNode.inputRows.map((row) => ({
      name: row.name,
      type: row.type,
      direction: row.direction,
      valuePath: row.valuePath,
      portPath: row.portPath,
      valueEditable: row.valueEditable,
      allowReference: row.allowReference,
    }))).toEqual([
      {
        name: "left",
        type: "number",
        direction: "input",
        valuePath: "$.inputs.left",
        portPath: "$.inputs.left",
        valueEditable: true,
        allowReference: false,
      },
      {
        name: "operator",
        type: "string",
        direction: "input",
        valuePath: "$.inputs.operator",
        portPath: "$.inputs.operator",
        valueEditable: true,
        allowReference: false,
      },
      {
        name: "right",
        type: "number",
        direction: "input",
        valuePath: "$.inputs.right",
        portPath: "$.inputs.right",
        valueEditable: true,
        allowReference: false,
      },
    ]);
  });

  it("projects return outputs into unified editable output rows", () => {
    const boundaryModel = buildWorkbenchModel(withBoundaryParameterMetadata(sampleDocument as UIDocument));
    const returnNode = boundaryModel.nodes.find((node) => node.id === "return_result")!;

    expect(returnNode.outputRows).toEqual([
      expect.objectContaining({
        name: "result",
        type: "number",
        direction: "output",
        portPath: "$.outputs.result",
        valuePath: "$.body.statements[1].returns.result",
        valueEditable: true,
        allowReference: true,
        allowDelete: true,
      }),
    ]);
  });

  it("projects normal block outputs as read-only output rows", () => {
    const calculateNode = model.nodes.find((node) => node.id === "calculate_large_value")!;

    expect(calculateNode.outputRows).toEqual([
      expect.objectContaining({
        name: "result",
        direction: "output",
        valueEditable: false,
        allowReference: false,
        allowDelete: false,
      }),
    ]);
  });

  it("does not invent result outputs for blocks that declare no outputs", () => {
    const delayModel = buildWorkbenchModel(delayDocument());
    const delayNode = delayModel.nodes.find((node) => node.id === "wait_before_list")!;

    expect(delayNode.outputs).toEqual([]);
    expect(delayNode.outputRows).toEqual([]);
    expect(delayModel.sources.map((source) => source.id)).not.toContain("node.wait_before_list.result");
    expect(getNodeIoLabel(delayNode)).toEqual(["1 个输入", "0 个输出"]);
  });

  it("projects block metadata outputs and editable implicit return output declarations", () => {
    const metadataModel = buildWorkbenchModel(fsListReturnDocument());
    const listNode = metadataModel.nodes.find((node) => node.id === "fs_list")!;
    const returnNode = metadataModel.nodes.find((node) => node.id === "return_outputs")!;

    expect(listNode.outputRows.map((row) => ({
      name: row.name,
      type: row.type,
      valueEditable: row.valueEditable,
      allowDelete: row.allowDelete,
    }))).toEqual([
      { name: "entries", type: "array", valueEditable: false, allowDelete: false },
      { name: "count", type: "number", valueEditable: false, allowDelete: false },
    ]);
    expect(metadataModel.sources.map((source) => source.id)).toContain("node.fs_list.entries");
    expect(metadataModel.sources.map((source) => source.id)).toContain("node.fs_list.count");
    expect(metadataModel.sources.map((source) => source.id)).not.toContain("node.fs_list.result");

    expect(returnNode.outputRows.map((row) => ({
      name: row.name,
      type: row.type,
      nameEditable: row.nameEditable,
      typeEditable: row.typeEditable,
      allowDelete: row.allowDelete,
      portPath: row.portPath,
      valuePath: row.valuePath,
    }))).toEqual([
      {
        name: "finally_ran",
        type: "boolean",
        nameEditable: true,
        typeEditable: true,
        allowDelete: true,
        portPath: "$.outputs.finally_ran",
        valuePath: "$.body.statements[1].returns.finally_ran",
      },
      {
        name: "last_item",
        type: "string",
        nameEditable: true,
        typeEditable: true,
        allowDelete: true,
        portPath: "$.outputs.last_item",
        valuePath: "$.body.statements[1].returns.last_item",
      },
    ]);
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

  it("uses block catalog input types instead of inferring from invalid literal values", () => {
    const catalogModel = buildWorkbenchModel(delayDocument("1"), [
      {
        id: "core.delay",
        namespace: "core",
        name: "delay",
        version: "1.0.0",
        inputs: [{ name: "durationMs", type: { name: "number" } }],
        outputs: [],
      },
    ]);
    const delayNode = catalogModel.nodes.find((node) => node.id === "wait_before_list")!;
    const durationField = delayNode.inputs.find((field) => field.key === "durationMs")!;
    const durationRow = delayNode.inputRows.find((row) => row.name === "durationMs")!;

    expect(durationField.type).toBe("number");
    expect(durationRow.type).toBe("number");
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

  it("uses workflow input values from document metadata instead of falling back to samples", () => {
    const editedDocument = structuredClone(sampleDocument) as UIDocument;
    editedDocument.metadata = {
      ...editedDocument.metadata,
      workflowInputValues: {
        operator: "-",
      },
    };

    const editedModel = buildWorkbenchModel(editedDocument);
    const startNode = editedModel.nodes.find((node) => node.id === "root")!;
    const operatorField = startNode.inputs.find((field) => field.key === "operator")!;

    expect(getResolvedFieldValue(operatorField, editedModel.sourcesById)).toBe("-");
    expect(editedModel.sourcesById.get("input.operator")?.displayValue).toBe("-");
    expect(operatorField.type).toBe("string");
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

  it("models return values as editable expressions", () => {
    const returnNode = model.nodes.find((node) => node.id === "return_result")!;

    expect(returnNode.outputs).toEqual([
      expect.objectContaining({
        key: "result",
        label: "result",
        type: "number",
        control: "reference",
        readonly: undefined,
        value: { kind: "ref", ref: "node.branch_by_threshold.result" },
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

    expect(layout.nodes.map((node) => node.node?.id)).toEqual(["root", "list_input_dir", "write_summary", "return_result"]);
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

  it("lays out if branches with branch headers and a visual join", () => {
    const layout = buildCanvasLayout(model);
    const branchNode = layout.nodes.find((node) => node.node?.id === "branch_by_threshold")!;
    const branchHeaders = layout.nodes.filter((node) => node.role === "branchHeader");
    const join = layout.nodes.find((node) => node.role === "join" && node.id === "branch_by_threshold:join");

    expect(branchHeaders.map((node) => node.label)).toEqual(["Then", "Else"]);
    expect(join).toEqual(expect.objectContaining({ role: "join", x: branchNode.x }));
    expect(layout.edges.map((edge) => `${edge.from}->${edge.to}`)).toContain("branch_by_threshold:join->return_result");
    expect(layout.nodes.find((node) => node.node?.id === "calculate_large_value")?.x).toBeLessThan(branchNode.x);
    expect(layout.nodes.find((node) => node.node?.id === "calculate_small_value")?.x).toBeGreaterThan(branchNode.x);
    expect(layout.insertControls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "insertBranch", nodeId: "branch_by_threshold", branchKind: "condition" }),
        expect.objectContaining({ kind: "insertNode", anchor: expect.objectContaining({ branchId: "branch_by_threshold.then", position: "branchStart" }) }),
        expect.objectContaining({ kind: "insertNode", anchor: expect.objectContaining({ branchId: "branch_by_threshold.then", position: "branchEnd" }) }),
        expect.objectContaining({ kind: "insertNode", anchor: expect.objectContaining({ afterNodeId: "branch_by_threshold", beforeNodeId: "return_result", position: "afterJoin" }) }),
      ]),
    );
  });

  it("lays out parallel branches with one lane per branch and a visual join", () => {
    const parallelModel = buildWorkbenchModel(branchDocument("parallel"));
    const layout = buildCanvasLayout(parallelModel);

    expect(layout.nodes.filter((node) => node.role === "branchHeader").map((node) => node.label)).toEqual(["并行 1", "并行 2"]);
    expect(layout.nodes.find((node) => node.id === "run_parallel:join")).toEqual(expect.objectContaining({ role: "join" }));
    expect(layout.insertControls).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: "insertBranch", nodeId: "run_parallel", branchKind: "parallel" })]),
    );
  });

  it("lays out empty branches with one placeholder insert control", () => {
    const emptyModel = buildWorkbenchModel(branchDocument("empty-if"));
    const layout = buildCanvasLayout(emptyModel);

    expect(layout.nodes.find((node) => node.id === "choose_path:condition_1:empty")).toEqual(
      expect.objectContaining({ role: "emptyBranch", branchId: "condition_1" }),
    );
    expect(layout.insertControls.filter((control) => control.anchor?.branchId === "condition_1")).toEqual([
      expect.objectContaining({ kind: "insertNode", anchor: expect.objectContaining({ position: "branchStart" }) }),
    ]);
  });

  it("lays out non-empty branches with start, between, and end insert controls", () => {
    const nonEmptyModel = buildWorkbenchModel(branchDocument("non-empty-if"));
    const layout = buildCanvasLayout(nonEmptyModel);

    expect(layout.insertControls.filter((control) => control.anchor?.branchId === "condition_1").map((control) => control.anchor?.position)).toEqual([
      "branchStart",
      "between",
      "branchEnd",
    ]);
  });

  it("lays out nested if branches inside existing branch lanes", () => {
    const nestedModel = buildWorkbenchModel(nestedBranchDocument("if"));
    const layout = buildCanvasLayout(nestedModel);
    const innerBranch = layout.nodes.find((node) => node.node?.id === "inner_choice")!;

    expect(layout.nodes.find((node) => node.id === "inner_choice:inner_then:header")).toEqual(
      expect.objectContaining({ role: "branchHeader", label: "内层条件" }),
    );
    expect(layout.nodes.find((node) => node.id === "inner_choice:inner_else:header")).toEqual(
      expect.objectContaining({ role: "branchHeader", label: "内层否则" }),
    );
    expect(layout.nodes.find((node) => node.id === "inner_choice:join")).toEqual(expect.objectContaining({ role: "join", x: innerBranch.x }));
    expect(layout.nodes.find((node) => node.node?.id === "inner_then_step")?.x).toBeLessThan(innerBranch.x);
    expect(layout.nodes.find((node) => node.node?.id === "inner_else_step")?.x).toBeGreaterThan(innerBranch.x);
    expect(layout.edges.map((edge) => `${edge.from}->${edge.to}`)).toContain("inner_choice:join->outer_choice:join");
    expect(layout.insertControls).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: "insertBranch", nodeId: "inner_choice", branchKind: "condition" })]),
    );
  });

  it("lays out nested parallel branches inside existing branch lanes", () => {
    const nestedModel = buildWorkbenchModel(nestedBranchDocument("parallel"));
    const layout = buildCanvasLayout(nestedModel);
    const innerParallel = layout.nodes.find((node) => node.node?.id === "inner_parallel")!;

    expect(layout.nodes.find((node) => node.id === "inner_parallel:parallel_left:header")).toEqual(
      expect.objectContaining({ role: "branchHeader", label: "内层并行 1" }),
    );
    expect(layout.nodes.find((node) => node.id === "inner_parallel:parallel_right:header")).toEqual(
      expect.objectContaining({ role: "branchHeader", label: "内层并行 2" }),
    );
    expect(layout.nodes.find((node) => node.id === "inner_parallel:join")).toEqual(expect.objectContaining({ role: "join", x: innerParallel.x }));
    expect(layout.nodes.find((node) => node.node?.id === "parallel_left_step")?.x).toBeLessThan(innerParallel.x);
    expect(layout.nodes.find((node) => node.node?.id === "parallel_right_step")?.x).toBeGreaterThan(innerParallel.x);
    expect(layout.edges.map((edge) => `${edge.from}->${edge.to}`)).toContain("inner_parallel:join->outer_choice:join");
    expect(layout.insertControls).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: "insertBranch", nodeId: "inner_parallel", branchKind: "parallel" })]),
    );
  });

  it("reserves enough horizontal room for nested three-branch if nodes", () => {
    const nestedModel = buildWorkbenchModel(nestedWideBranchDocument("if"));
    const layout = buildCanvasLayout(nestedModel);
    const outerFirstHeader = layout.nodes.find((node) => node.id === "outer_choice:outer_first:header")!;
    const innerFirstHeader = layout.nodes.find((node) => node.id === "inner_choice:inner_first:header")!;
    const innerSecondHeader = layout.nodes.find((node) => node.id === "inner_choice:inner_second:header")!;
    const innerThirdHeader = layout.nodes.find((node) => node.id === "inner_choice:inner_third:header")!;

    expect(innerFirstHeader.x).toBeGreaterThan(outerFirstHeader.x);
    expect([outerFirstHeader.x, innerFirstHeader.x, innerSecondHeader.x, innerThirdHeader.x]).toEqual([
      ...new Set([outerFirstHeader.x, innerFirstHeader.x, innerSecondHeader.x, innerThirdHeader.x]),
    ]);
  });

  it("reserves enough horizontal room for nested three-branch parallel nodes", () => {
    const nestedModel = buildWorkbenchModel(nestedWideBranchDocument("parallel"));
    const layout = buildCanvasLayout(nestedModel);
    const outerFirstHeader = layout.nodes.find((node) => node.id === "outer_parallel:outer_first:header")!;
    const innerFirstHeader = layout.nodes.find((node) => node.id === "inner_parallel:inner_first:header")!;
    const innerSecondHeader = layout.nodes.find((node) => node.id === "inner_parallel:inner_second:header")!;
    const innerThirdHeader = layout.nodes.find((node) => node.id === "inner_parallel:inner_third:header")!;

    expect(innerFirstHeader.x).toBeGreaterThan(outerFirstHeader.x);
    expect([outerFirstHeader.x, innerFirstHeader.x, innerSecondHeader.x, innerThirdHeader.x]).toEqual([
      ...new Set([outerFirstHeader.x, innerFirstHeader.x, innerSecondHeader.x, innerThirdHeader.x]),
    ]);
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

function withBoundaryParameterMetadata(document: UIDocument): UIDocument {
  const clone = structuredClone(document);
  clone.root.metadata = {
    ...clone.root.metadata,
    allowCustomInput: true,
  };
  clone.root = markReturnNodes(clone.root);
  return clone;
}

function markReturnNodes(node: UIDocument["root"]): UIDocument["root"] {
  return {
    ...node,
    metadata:
      node.kind === "return"
        ? {
            ...node.metadata,
            allowCustomOutput: true,
          }
        : node.metadata,
    children: node.children?.map(markReturnNodes),
    branches: node.branches?.map((branch) => ({
      ...branch,
      children: branch.children?.map(markReturnNodes),
    })),
  };
}

function branchDocument(kind: "parallel" | "empty-if" | "non-empty-if"): UIDocument {
  if (kind === "parallel") {
    return {
      schemaVersion: "1.0.0",
      workflowId: "parallel_layout",
      root: {
        id: "root",
        kind: "sequence",
        label: "Start",
        children: [
          {
            id: "run_parallel",
            kind: "parallel",
            label: "Run Parallel",
            branches: [
              { id: "branch_1", label: "并行 1", kind: "parallel", children: [{ id: "left_step", kind: "callBlock", label: "Left" }] },
              { id: "branch_2", label: "并行 2", kind: "parallel", children: [{ id: "right_step", kind: "callBlock", label: "Right" }] },
            ],
          },
        ],
      },
    };
  }

  return {
    schemaVersion: "1.0.0",
    workflowId: `${kind}_layout`,
    root: {
      id: "root",
      kind: "sequence",
      label: "Start",
      children: [
        {
          id: "choose_path",
          kind: "if",
          label: "Choose Path",
          branches: [
            {
              id: "condition_1",
              label: "条件 1",
              kind: "condition",
              children:
                kind === "non-empty-if"
                  ? [
                      { id: "first_condition_step", kind: "callBlock", label: "First" },
                      { id: "second_condition_step", kind: "callBlock", label: "Second" },
                    ]
                  : [],
            },
            { id: "else", label: "否则", kind: "default", children: [] },
          ],
        },
      ],
    },
  };
}

function nestedBranchDocument(kind: "if" | "parallel"): UIDocument {
  const nestedNode =
    kind === "if"
      ? {
          id: "inner_choice",
          kind: "if",
          label: "Inner Choice",
          branches: [
            {
              id: "inner_then",
              label: "内层条件",
              kind: "condition",
              children: [{ id: "inner_then_step", kind: "callBlock", label: "Inner Then" }],
            },
            {
              id: "inner_else",
              label: "内层否则",
              kind: "default",
              children: [{ id: "inner_else_step", kind: "callBlock", label: "Inner Else" }],
            },
          ],
        }
      : {
          id: "inner_parallel",
          kind: "parallel",
          label: "Inner Parallel",
          branches: [
            {
              id: "parallel_left",
              label: "内层并行 1",
              kind: "parallel",
              children: [{ id: "parallel_left_step", kind: "callBlock", label: "Inner Parallel Left" }],
            },
            {
              id: "parallel_right",
              label: "内层并行 2",
              kind: "parallel",
              children: [{ id: "parallel_right_step", kind: "callBlock", label: "Inner Parallel Right" }],
            },
          ],
        };

  return {
    schemaVersion: "1.0.0",
    workflowId: `${kind}_nested_layout`,
    root: {
      id: "root",
      kind: "sequence",
      label: "Start",
      children: [
        {
          id: "outer_choice",
          kind: "if",
          label: "Outer Choice",
          branches: [
            {
              id: "outer_then",
              label: "外层条件",
              kind: "condition",
              children: [nestedNode],
            },
            {
              id: "outer_else",
              label: "外层否则",
              kind: "default",
              children: [{ id: "outer_else_step", kind: "callBlock", label: "Outer Else" }],
            },
          ],
        },
      ],
    },
  } as UIDocument;
}

function nestedWideBranchDocument(kind: "if" | "parallel"): UIDocument {
  const outerId = kind === "if" ? "outer_choice" : "outer_parallel";
  const innerId = kind === "if" ? "inner_choice" : "inner_parallel";
  const branchKind = kind === "if" ? "condition" : "parallel";
  const defaultKind = kind === "if" ? "default" : "parallel";

  return {
    schemaVersion: "1.0.0",
    workflowId: `${kind}_nested_wide_layout`,
    root: {
      id: "root",
      kind: "sequence",
      label: "Start",
      children: [
        {
          id: outerId,
          kind,
          label: "Outer",
          branches: [
            {
              id: "outer_first",
              label: kind === "if" ? "条件 1" : "并行 1",
              kind: branchKind,
              children: [{ id: "outer_first_step", kind: "callBlock", label: "Outer First" }],
            },
            {
              id: "outer_second",
              label: kind === "if" ? "否则" : "并行 2",
              kind: defaultKind,
              children: [
                {
                  id: innerId,
                  kind,
                  label: "Inner",
                  branches: [
                    { id: "inner_first", label: kind === "if" ? "条件 1" : "并行 1", kind: branchKind, children: [] },
                    { id: "inner_second", label: kind === "if" ? "条件 2" : "并行 2", kind: branchKind, children: [] },
                    { id: "inner_third", label: kind === "if" ? "否则" : "并行 3", kind: defaultKind, children: [] },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  };
}

function fsListReturnDocument(): UIDocument {
  const availableTokens = [
    { group: "Global State", ref: "state.finally_ran", label: "finally_ran", type: "boolean", detail: "Global state" },
    { group: "Global State", ref: "state.last_item", label: "last_item", type: "string", detail: "Global state" },
    { group: "Upstream Outputs", ref: "node.fs_list.entries", label: "fs_list.entries", type: "array", detail: "fs.list" },
    { group: "Upstream Outputs", ref: "node.fs_list.count", label: "fs_list.count", type: "number", detail: "fs.list" },
  ];

  return {
    schemaVersion: "1.0.0",
    workflowId: "sample_workflow",
    root: {
      id: "root",
      kind: "sequence",
      label: "Start",
      metadata: { allowCustomInput: true },
      children: [
        {
          id: "fs_list",
          kind: "callBlock",
          label: "fs.list",
          path: "$.body.statements[0]",
          metadata: {
            outputs: [
              { group: "Upstream Outputs", ref: "node.fs_list.entries", label: "fs_list.entries", type: "array", detail: "fs.list" },
              { group: "Upstream Outputs", ref: "node.fs_list.count", label: "fs_list.count", type: "number", detail: "fs.list" },
            ],
          },
          inspector: [
            { path: "$.body.statements[0].inputs.path", label: "Input path", control: "expression", value: { kind: "literal", value: "" } },
            { path: "$.body.statements[0].inputs.recursive", label: "Input recursive", control: "expression", value: { kind: "literal", value: false } },
          ],
        },
        {
          id: "return_outputs",
          kind: "return",
          label: "Return",
          path: "$.body.statements[1]",
          metadata: { allowCustomOutput: true },
          inspector: [
            {
              path: "$.body.statements[1].returns.finally_ran",
              label: "Return finally_ran",
              control: "expression",
              value: { kind: "ref", ref: "state.finally_ran" },
              metadata: { availableTokens },
            },
            {
              path: "$.body.statements[1].returns.last_item",
              label: "Return last_item",
              control: "expression",
              value: { kind: "ref", ref: "state.last_item" },
              metadata: { availableTokens },
            },
          ],
        },
      ],
    },
  };
}

function withCalculatorOutputMetadata(document: UIDocument): UIDocument {
  const clone = structuredClone(document);
  const visit = (node: UIDocument["root"]) => {
    if (node.id === "calculate_large_value" || node.id === "calculate_small_value") {
      node.metadata = {
        ...node.metadata,
        outputs: [
          {
            group: "Upstream Outputs",
            ref: `node.${node.id}.result`,
            label: `${node.id}.result`,
            type: "number",
            detail: "math.calculate",
          },
        ],
      };
    }
    node.children?.forEach(visit);
    node.branches?.forEach((branch) => branch.children?.forEach(visit));
  };
  visit(clone.root);
  return clone;
}

function delayDocument(durationMs: unknown = 0): UIDocument {
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
              value: { kind: "literal", value: durationMs },
            },
          ],
        },
      ],
    },
  };
}
