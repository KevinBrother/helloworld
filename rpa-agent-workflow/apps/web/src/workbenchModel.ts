import type { BlockDefinition, InspectorField, UIDocument, UINode } from "./types";

export type FieldType = "number" | "string" | "boolean" | "path" | "object" | "array" | "unknown";
export type FieldControl = "input" | "select" | "reference" | "expression" | "readonly";

export type WorkbenchField = {
  key: string;
  label: string;
  type: FieldType;
  control: FieldControl;
  path: string;
  value: unknown;
  readonly?: boolean;
  options?: string[];
};

export type WorkbenchPort = {
  key: string;
  label: string;
  type: FieldType;
  path: string;
  value: {
    name: string;
    type: {
      name: string;
    };
  };
};

export type WorkbenchSource = {
  id: string;
  nodeId: string;
  nodeLabel: string;
  output: string;
  type: FieldType;
  value: unknown;
  displayValue: string;
  options?: string[];
  order: number;
};

export type WorkbenchNode = {
  id: string;
  kind: string;
  label: string;
  path?: string;
  branch?: string;
  order: number;
  raw: UINode;
  inputs: WorkbenchField[];
  outputs: WorkbenchField[];
  inputPorts: WorkbenchPort[];
  outputPorts: WorkbenchPort[];
  deletable: boolean;
  deleteMessage: string;
  hasNestedChildren: boolean;
};

export type BlockOption = {
  key: string;
  category: string;
  detail: string;
  instances: number;
};

export type WorkbenchModel = {
  workflowId: string;
  workflowName: string;
  root: UINode;
  nodes: WorkbenchNode[];
  sources: WorkbenchSource[];
  sourcesById: Map<string, WorkbenchSource>;
  blockOptions: BlockOption[];
};

type WorkflowInputValues = Record<string, unknown>;

export type CanvasTopology = {
  start?: WorkbenchNode;
  decision?: WorkbenchNode;
  thenNodes: WorkbenchNode[];
  elseNodes: WorkbenchNode[];
  returnNode?: WorkbenchNode;
};

export type CanvasLayoutNode = {
  node: WorkbenchNode;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CanvasLayoutEdge = {
  id: string;
  from: string;
  to: string;
  anchor: InsertAnchor;
};

export type InsertAnchor = {
  afterNodeId?: string;
  beforeNodeId?: string;
  containerNodeId?: string;
  branchId?: string;
  position?: "branchStart" | "branchEnd" | "between" | "afterJoin";
};

export type CanvasLayout = {
  width: number;
  height: number;
  nodes: CanvasLayoutNode[];
  edges: CanvasLayoutEdge[];
};

const SAMPLE_INPUT_VALUES: Record<string, unknown> = {
  left: 12,
  operator: "+",
  right: 7,
};

const CANVAS_LINEAR_WIDTH = 560;
const CANVAS_BRANCH_WIDTH = 980;
const CANVAS_MIN_HEIGHT = 700;
const CANVAS_NODE_WIDTH = 300;
const CANVAS_NODE_HEIGHT = 96;
const CANVAS_START_Y = 18;
const CANVAS_STEP_GAP_Y = 76;
const CANVAS_STEP_Y = CANVAS_NODE_HEIGHT + CANVAS_STEP_GAP_Y;
const CANVAS_BRANCH_START_GAP_Y = 124;
const CANVAS_BRANCH_LANE_GAP_X = 320;

export function buildWorkbenchModel(document: UIDocument, blockCatalog: BlockDefinition[] = []): WorkbenchModel {
  const nodes = flattenWorkbenchNodes(document.root, workflowInputValuesFromDocument(document), rootWorkflowOutputPorts(document.root));
  const sources = buildSources(nodes);
  const instances = new Map<string, number>();

  for (const node of nodes) {
    if (node.kind === "callBlock") {
      instances.set(node.label, (instances.get(node.label) ?? 0) + 1);
    }
  }

  return {
    workflowId: document.workflowId,
    workflowName: String(document.metadata?.workflowName ?? document.workflowId),
    root: document.root,
    nodes,
    sources,
    sourcesById: new Map(sources.map((source) => [source.id, source])),
    blockOptions: buildBlockOptions(blockCatalog, instances),
  };
}

function buildBlockOptions(blockCatalog: BlockDefinition[], instances: Map<string, number>): BlockOption[] {
  return blockCatalog.map((definition) => ({
    key: definition.id,
    category: definition.namespace || "block",
    detail: definition.description || formatPortSummary(definition.inputs?.length ?? 0, definition.outputs?.length ?? 0),
    instances: instances.get(definition.id) ?? 0,
  }));
}

function formatPortSummary(inputCount: number, outputCount: number) {
  return `${inputCount} 个输入 / ${outputCount} 个输出`;
}

export function getNodeIoLabel(node: WorkbenchNode) {
  if (isWorkflowInputNode(node)) {
    return [`${node.inputPorts.length} 个流程输入`];
  }

  if (node.kind === "return") {
    return [`${node.outputPorts.length || node.outputs.length} 个流程输出`];
  }

  return [`${node.inputs.length} 个输入`, `${node.outputs.length} 个输出`];
}

export function getSourceOptions(nodes: WorkbenchNode[], currentNodeId: string, field: WorkbenchField) {
  const current = nodes.find((node) => node.id === currentNodeId);
  const sources = buildSources(nodes);

  if (!current) {
    return sources.filter((source) => source.type === field.type);
  }

  return sources.filter((source) => {
    if (source.order >= current.order || source.type !== field.type || !isCompatibleSource(field, source)) {
      return false;
    }

    const sourceNode = nodes.find((node) => node.id === source.nodeId);
    if (current.kind === "return") {
      return sourceNode?.kind === "callBlock";
    }

    if (sourceNode?.kind === "if" && sourceNode.path && current.path?.startsWith(`${sourceNode.path}.`)) {
      return false;
    }

    return true;
  });
}

export function getResolvedFieldValue(field: WorkbenchField, sourcesById: Map<string, WorkbenchSource>) {
  const ref = expressionRef(field.value);
  if (ref) {
    return sourcesById.get(ref)?.displayValue ?? ref;
  }

  if (isExpressionRecord(field.value) && field.value.kind === "literal") {
    return formatDisplayValue(field.value.value);
  }

  if (isExpressionRecord(field.value) && field.value.kind === "binary") {
    const left = getResolvedExpressionValue(field.value.left, sourcesById);
    const right = getResolvedExpressionValue(field.value.right, sourcesById);
    return `${left} ${String(field.value.op ?? "?")} ${right}`;
  }

  if (isExpressionRecord(field.value) && field.value.kind === "branch") {
    return "branch result";
  }

  return formatDisplayValue(field.value);
}

export function getFieldSourceId(field: WorkbenchField) {
  return expressionRef(field.value);
}

export function makeFieldValueFromSource(sourceId: string) {
  return { kind: "ref", ref: sourceId };
}

export function buildCanvasTopology(model: WorkbenchModel): CanvasTopology {
  const start = model.nodes.find((node) => node.kind === "sequence" && node.order === 0);
  const decision = model.nodes.find((node) => node.kind === "if");
  const thenNodes = model.nodes.filter((node) => node.branch?.toLowerCase() === "then");
  const elseNodes = model.nodes.filter((node) => node.branch?.toLowerCase() === "else");
  const returnNode = model.nodes.find((node) => node.kind === "return");

  return {
    start,
    decision,
    thenNodes,
    elseNodes,
    returnNode,
  };
}

export function buildCanvasLayout(model: WorkbenchModel): CanvasLayout {
  const nodeById = new Map(model.nodes.map((node) => [node.id, node]));
  const layoutNodes: CanvasLayoutNode[] = [];
  const edges: CanvasLayoutEdge[] = [];
  const placed = new Set<string>();
  const hasBranches = model.nodes.some((node) => node.kind === "if" && node.raw.branches?.length);
  const canvasWidth = hasBranches ? CANVAS_BRANCH_WIDTH : CANVAS_LINEAR_WIDTH;
  const canvasCenterX = canvasWidth / 2;

  const placeNode = (nodeId: string, x: number, y: number) => {
    const node = nodeById.get(nodeId);
    if (!node || placed.has(nodeId)) return;
    placed.add(nodeId);
    layoutNodes.push({ node, x, y, width: CANVAS_NODE_WIDTH, height: CANVAS_NODE_HEIGHT });
  };

  const connect = (fromIds: string[], toId: string) => {
    for (const fromId of fromIds) {
      if (fromId !== toId) {
        edges.push({
          id: `${fromId}->${toId}`,
          from: fromId,
          to: toId,
          anchor: {
            afterNodeId: fromId,
            beforeNodeId: toId,
            containerNodeId: model.root.id,
          },
        });
      }
    }
  };

  placeNode(model.root.id, canvasCenterX, CANVAS_START_Y);

  let previousIds = [model.root.id];
  let cursorY = CANVAS_START_Y + CANVAS_STEP_Y;

  for (const child of model.root.children ?? []) {
    if (child.kind === "if" && child.branches?.length) {
      placeNode(child.id, canvasCenterX, cursorY);
      connect(previousIds, child.id);

      const branchStartY = cursorY + CANVAS_NODE_HEIGHT + CANVAS_BRANCH_START_GAP_Y;
      const laneXs = getBranchLaneCenters(child.branches.length, canvasCenterX);
      const branchEndIds: string[] = [];
      let branchBottomY = branchStartY;

      child.branches.forEach((branch, branchIndex) => {
        let branchPreviousIds = [child.id];
        let branchCursorY = branchStartY;
        const branchChildren = branch.children ?? [];

        for (const branchChild of branchChildren) {
          placeNode(branchChild.id, laneXs[branchIndex], branchCursorY);
          connect(branchPreviousIds, branchChild.id);
          branchPreviousIds = [branchChild.id];
          branchCursorY += CANVAS_STEP_Y;
        }

        branchEndIds.push(...branchPreviousIds);
        branchBottomY = Math.max(branchBottomY, branchCursorY - CANVAS_STEP_GAP_Y);
      });

      previousIds = unique(branchEndIds);
      cursorY = branchBottomY + CANVAS_BRANCH_START_GAP_Y;
      continue;
    }

    placeNode(child.id, canvasCenterX, cursorY);
    connect(previousIds, child.id);
    previousIds = [child.id];
    cursorY += CANVAS_STEP_Y;
  }

  for (const node of model.nodes) {
    if (!placed.has(node.id)) {
      placeNode(node.id, canvasCenterX, cursorY);
      connect(previousIds, node.id);
      previousIds = [node.id];
      cursorY += CANVAS_STEP_Y;
    }
  }

  const maxNodeX = Math.max(...layoutNodes.map((node) => node.x + CANVAS_NODE_WIDTH / 2), canvasWidth);
  const minNodeX = Math.min(...layoutNodes.map((node) => node.x - CANVAS_NODE_WIDTH / 2), 0);
  const maxNodeY = Math.max(...layoutNodes.map((node) => node.y + node.height), CANVAS_MIN_HEIGHT);

  return {
    width: Math.max(canvasWidth, maxNodeX - minNodeX),
    height: Math.max(CANVAS_MIN_HEIGHT, maxNodeY + CANVAS_STEP_GAP_Y),
    nodes: layoutNodes,
    edges,
  };
}

function getBranchLaneCenters(count: number, centerX: number) {
  if (count <= 1) return [centerX];
  const firstLaneX = centerX - ((count - 1) * CANVAS_BRANCH_LANE_GAP_X) / 2;
  return Array.from({ length: count }, (_, index) => firstLaneX + index * CANVAS_BRANCH_LANE_GAP_X);
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function flattenWorkbenchNodes(root: UINode, workflowInputValues: WorkflowInputValues, workflowOutputPorts: WorkbenchPort[]) {
  const nodes: WorkbenchNode[] = [];

  const visit = (node: UINode, branch?: string) => {
    nodes.push(toWorkbenchNode(node, nodes.length, branch, workflowInputValues, workflowOutputPorts));
    for (const child of node.children ?? []) {
      visit(child, branch);
    }
    for (const nodeBranch of node.branches ?? []) {
      for (const child of nodeBranch.children ?? []) {
        visit(child, nodeBranch.label ?? nodeBranch.kind);
      }
    }
  };

  visit(root);
  return nodes;
}

function toWorkbenchNode(
  node: UINode,
  order: number,
  branch: string | undefined,
  workflowInputValues: WorkflowInputValues,
  workflowOutputPorts: WorkbenchPort[],
): WorkbenchNode {
  const fields = node.inspector ?? [];
  const inputPorts = fields.filter(isWorkflowInputPortField).map(toWorkbenchPort);
  const outputPorts = fields.filter(isWorkflowOutputPortField).map(toWorkbenchPort);
  const nodeOutputPorts = node.kind === "return" && outputPorts.length === 0 ? workflowOutputPorts : outputPorts;
  const inputs = fields
    .filter(isInputField)
    .flatMap((field) => toInputFields(field, order === 0 && node.kind === "sequence", workflowInputValues));
  const outputs = fields.filter(isOutputField).map((field) => toWorkbenchField(field, false, false));

  if (node.kind === "callBlock" && outputs.length === 0) {
    outputs.push({
      key: "result",
      label: "result",
      type: "number",
      control: "readonly",
      path: `${node.path ?? node.id}.outputs.result`,
      value: undefined,
      readonly: true,
    });
  }

  return {
    id: node.id,
    kind: node.kind,
    label: node.label ?? node.id,
    path: node.path,
    branch,
    order,
    raw: node,
    inputs,
    outputs,
    inputPorts,
    outputPorts: nodeOutputPorts,
    deletable: isNodeDeletable(node, order),
    deleteMessage: getDeleteMessage(node, order),
    hasNestedChildren: hasNestedChildren(node),
  };
}

function isNodeDeletable(node: UINode, order: number) {
  if (node.kind === "sequence" && order === 0) return false;
  if (node.kind === "return") return false;
  if (node.capabilities?.deleteNode?.enabled === false) return false;
  return true;
}

function getDeleteMessage(node: UINode, order: number) {
  if (node.kind === "sequence" && order === 0) return "开始节点不能删除";
  if (node.kind === "return") return "返回节点不能删除";
  if (hasNestedChildren(node)) return "删除该节点会同时删除内部子节点";
  return "删除该节点";
}

function hasNestedChildren(node: UINode) {
  if ((node.children?.length ?? 0) > 0) return true;
  return (node.branches ?? []).some((branch) => (branch.children?.length ?? 0) > 0);
}

function isInputField(field: InspectorField) {
  if (field.control === "port") {
    return isWorkflowInputPortField(field);
  }

  return field.path.includes(".inputs.") || field.label === "Condition";
}

function isOutputField(field: InspectorField) {
  if (field.control === "port") return false;
  return field.path.includes(".outputs.") || field.path.includes(".returns.");
}

function isWorkflowInputPortField(field: InspectorField) {
  return field.control === "port" && field.path.startsWith("$.inputs.");
}

function isWorkflowOutputPortField(field: InspectorField) {
  return field.control === "port" && field.path.startsWith("$.outputs.");
}

function toWorkbenchPort(field: InspectorField): WorkbenchPort {
  const key = fieldKey(field);
  return {
    key,
    label: key,
    type: inferFieldType(field),
    path: field.path,
    value: {
      name: key,
      type: {
        name: inferFieldType(field) === "unknown" ? "string" : inferFieldType(field),
      },
    },
  };
}

function rootWorkflowOutputPorts(root: UINode) {
  return (root.inspector ?? []).filter(isWorkflowOutputPortField).map(toWorkbenchPort);
}

function toWorkbenchField(
  field: InspectorField,
  editableWorkflowInput = false,
  declarationOnly = false,
  workflowInputValues: WorkflowInputValues = {},
): WorkbenchField {
  const key = fieldKey(field);
  return {
    key,
    label: key,
    type: inferFieldType(field),
    control: declarationOnly ? "readonly" : editableWorkflowInput ? "input" : inferControl(field),
    path: field.path,
    value: declarationOnly ? undefined : field.control === "port" ? workflowInputValue(field, key, workflowInputValues) : field.value,
    readonly: declarationOnly ? true : editableWorkflowInput ? false : field.readonly,
    options: inferOptions(key, field.path),
  };
}

function toInputFields(field: InspectorField, editableWorkflowInput = false, workflowInputValues: WorkflowInputValues = {}): WorkbenchField[] {
  if (field.label === "Condition" && isExpressionRecord(field.value) && field.value.kind === "binary") {
    const operatorValue = isRecord(field.value.operator) ? field.value.operator : { kind: "literal", value: String(field.value.op ?? ">") };
    return [
      {
        key: "left",
        label: "left",
        type: "number",
        control: expressionRef(field.value.left) ? "reference" : "input",
        path: `${field.path}.left`,
        value: field.value.left,
        options: undefined,
      },
      {
        key: "operator",
        label: "operator",
        type: "string",
        control: expressionRef(operatorValue) ? "reference" : "input",
        path: `${field.path}.operator`,
        value: operatorValue,
        options: [">", ">=", "<", "<=", "=="],
      },
      {
        key: "right",
        label: "right",
        type: "number",
        control: expressionRef(field.value.right) ? "reference" : "input",
        path: `${field.path}.right`,
        value: field.value.right,
        options: undefined,
      },
    ];
  }

  return [toWorkbenchField(field, editableWorkflowInput, false, workflowInputValues)];
}

function buildSources(nodes: WorkbenchNode[]) {
  const sources: WorkbenchSource[] = [];

  for (const node of nodes) {
    if (isWorkflowInputNode(node)) {
      for (const field of node.inputs) {
        sources.push({
          id: `input.${field.key}`,
          nodeId: node.id,
          nodeLabel: "流程输入",
          output: field.key,
          type: field.type,
          value: field.value,
          displayValue: String(getResolvedFieldValue(field, new Map())),
          options: field.options,
          order: node.order,
        });
      }
      continue;
    }

    for (const field of node.outputs) {
      const id = `node.${node.id}.${field.key}`;
      sources.push({
        id,
        nodeId: node.id,
        nodeLabel: node.label,
        output: field.key,
        type: field.type,
        value: field.value,
        displayValue: estimateNodeOutputValue(node, field),
        options: field.options,
        order: node.order,
      });
    }
  }

  return sources;
}

function isCompatibleSource(field: WorkbenchField, source: WorkbenchSource) {
  if (field.key !== "operator" || !field.options?.length || !source.options?.length) {
    return true;
  }
  const allowed = new Set(field.options);
  return source.options.every((option) => allowed.has(option));
}

function workflowInputValue(field: InspectorField, key: string, workflowInputValues: WorkflowInputValues) {
  if (Object.hasOwn(workflowInputValues, key)) {
    return workflowInputValues[key];
  }
  if (isExpressionRecord(field.value)) {
    return field.value;
  }
  return SAMPLE_INPUT_VALUES[key] ?? "";
}

function workflowInputValuesFromDocument(document: UIDocument): WorkflowInputValues {
  const value = document.metadata?.workflowInputValues;
  if (!isRecord(value)) return {};
  return value;
}

function isWorkflowInputNode(node: WorkbenchNode) {
  return node.kind === "sequence" && node.order === 0;
}

function inferFieldType(field: InspectorField): FieldType {
  if (field.control === "port" && isRecord(field.value)) {
    const type = field.value.type;
    if (isRecord(type) && typeof type.name === "string") {
      return normalizeType(type.name);
    }
  }

  const key = fieldKey(field).toLowerCase();
  if (key.includes("operator")) return "string";
  if (key.includes("path")) return "path";
  if (key.includes("enabled") || key.includes("active")) return "boolean";
  if (key.includes("condition")) return "boolean";
  if (key.includes("result") || key.includes("left") || key.includes("right")) return "number";

  const value = field.value;
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "string") return "string";

  return "unknown";
}

function inferControl(field: InspectorField): FieldControl {
  if (field.readonly) return "readonly";
  if (field.control === "expression") {
    return expressionRef(field.value) ? "reference" : "expression";
  }
  if (field.control === "port") return "input";
  return "input";
}

function inferOptions(key: string, path: string) {
  if (key === "operator" && path.includes(".condition.")) return [">", ">=", "<", "<=", "=="];
  if (key === "operator") return ["+", "-", "*", "/"];
  return undefined;
}

function fieldKey(field: InspectorField) {
  if (field.control === "port" && isRecord(field.value) && typeof field.value.name === "string") {
    return field.value.name;
  }

  const pathSegment = field.path.split(".").at(-1);
  const fromPath = pathSegment && !pathSegment.includes("$") ? pathSegment : undefined;
  const fromLabel = field.label?.replace(/^(Input|Output|Return)\s+/i, "").trim();
  return normalizeKey(fromPath ?? fromLabel ?? field.label ?? field.path);
}

function normalizeKey(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase() === "return result" ? "result" : value.trim().replace(/\s+/g, "_");
}

function normalizeType(value: string): FieldType {
  if (value === "number" || value === "string" || value === "boolean" || value === "path") return value;
  if (value === "object") return "object";
  return "unknown";
}

function expressionRef(value: unknown) {
  if (isExpressionRecord(value) && value.kind === "ref" && typeof value.ref === "string") {
    return value.ref;
  }
  return undefined;
}

function getResolvedExpressionValue(value: unknown, sourcesById: Map<string, WorkbenchSource>) {
  const ref = expressionRef(value);
  if (ref) return sourcesById.get(ref)?.displayValue ?? ref;
  if (isExpressionRecord(value) && value.kind === "literal") return formatDisplayValue(value.value);
  return formatDisplayValue(value);
}

function estimateNodeOutputValue(node: WorkbenchNode, field: WorkbenchField) {
  if (node.kind === "if") return "19";
  if (node.id.includes("large")) return "19";
  if (node.id.includes("small")) return "5";
  if (node.kind === "return") return "19";
  return formatDisplayValue(field.value);
}

function formatDisplayValue(value: unknown) {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function pluralize(word: string, count: number) {
  return count === 1 ? word : `${word}s`;
}

function isExpressionRecord(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && typeof value.kind === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
