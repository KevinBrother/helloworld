import type { InspectorField, UIDocument, UINode } from "./types";

export type FieldType = "number" | "string" | "boolean" | "path" | "object" | "unknown";
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

export type WorkbenchSource = {
  id: string;
  nodeId: string;
  nodeLabel: string;
  output: string;
  type: FieldType;
  value: unknown;
  displayValue: string;
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

export type CanvasTopology = {
  start?: WorkbenchNode;
  decision?: WorkbenchNode;
  thenNodes: WorkbenchNode[];
  elseNodes: WorkbenchNode[];
  returnNode?: WorkbenchNode;
};

const SAMPLE_INPUT_VALUES: Record<string, unknown> = {
  left: 12,
  operator: "+",
  right: 7,
};

const BLOCK_CATALOG: Array<Omit<BlockOption, "instances">> = [
  { key: "math.calculate", category: "Computation", detail: "Pure numeric operation with one result" },
  { key: "browser.click", category: "Browser", detail: "Click an element in an active browser session" },
  { key: "file.read", category: "Filesystem", detail: "Read a file into workflow state" },
  { key: "http.request", category: "Network", detail: "Call an HTTP endpoint and expose response data" },
  { key: "condition", category: "Control", detail: "Split into then and else paths" },
  { key: "loop", category: "Control", detail: "Repeat steps for each item in a list" },
  { key: "return", category: "Control", detail: "Define workflow output values" },
];

export function buildWorkbenchModel(document: UIDocument): WorkbenchModel {
  const nodes = flattenWorkbenchNodes(document.root);
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
    blockOptions: BLOCK_CATALOG.map((option) => ({ ...option, instances: instances.get(option.key) ?? 0 })),
  };
}

export function getNodeIoLabel(node: WorkbenchNode) {
  if (isWorkflowInputNode(node)) {
    return [`${node.inputs.length} workflow ${pluralize("input", node.inputs.length)}`];
  }

  if (node.kind === "return") {
    return [`${node.outputs.length} workflow ${pluralize("output", node.outputs.length)}`];
  }

  return [`${node.inputs.length} ${pluralize("input", node.inputs.length)}`, `${node.outputs.length} ${pluralize("output", node.outputs.length)}`];
}

export function getSourceOptions(nodes: WorkbenchNode[], currentNodeId: string, field: WorkbenchField) {
  const current = nodes.find((node) => node.id === currentNodeId);
  const sources = buildSources(nodes);

  if (!current) {
    return sources.filter((source) => source.type === field.type);
  }

  return sources.filter((source) => {
    if (source.order >= current.order || source.type !== field.type) {
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

function flattenWorkbenchNodes(root: UINode) {
  const nodes: WorkbenchNode[] = [];

  const visit = (node: UINode, branch?: string) => {
    nodes.push(toWorkbenchNode(node, nodes.length, branch));
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

function toWorkbenchNode(node: UINode, order: number, branch?: string): WorkbenchNode {
  const fields = node.inspector ?? [];
  const inputs = fields.filter(isInputField).flatMap((field) => toInputFields(field, order === 0 && node.kind === "sequence"));
  const outputs = fields.filter(isOutputField).map((field) => toWorkbenchField(field, false, node.kind === "return"));

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
  };
}

function isInputField(field: InspectorField) {
  if (field.control === "port") {
    return field.path.includes("$.inputs.");
  }

  return field.path.includes(".inputs.") || field.label === "Condition";
}

function isOutputField(field: InspectorField) {
  return field.path.includes(".outputs.") || field.path.includes(".returns.");
}

function toWorkbenchField(field: InspectorField, editableWorkflowInput = false, declarationOnly = false): WorkbenchField {
  const key = fieldKey(field);
  return {
    key,
    label: key,
    type: inferFieldType(field),
    control: declarationOnly ? "readonly" : editableWorkflowInput ? "input" : inferControl(field),
    path: field.path,
    value: declarationOnly ? undefined : field.control === "port" ? SAMPLE_INPUT_VALUES[key] : field.value,
    readonly: declarationOnly ? true : editableWorkflowInput ? false : field.readonly,
    options: inferOptions(key, field.path),
  };
}

function toInputFields(field: InspectorField, editableWorkflowInput = false): WorkbenchField[] {
  if (field.label === "Condition" && isExpressionRecord(field.value) && field.value.kind === "binary") {
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
        control: "select",
        path: `${field.path}.operator`,
        value: { kind: "literal", value: String(field.value.op ?? ">") },
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

  return [toWorkbenchField(field, editableWorkflowInput)];
}

function buildSources(nodes: WorkbenchNode[]) {
  const sources: WorkbenchSource[] = [];

  for (const node of nodes) {
    if (isWorkflowInputNode(node)) {
      for (const field of node.inputs) {
        sources.push({
          id: `input.${field.key}`,
          nodeId: node.id,
          nodeLabel: "Workflow Inputs",
          output: field.key,
          type: field.type,
          value: field.value,
          displayValue: formatDisplayValue(field.value),
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
        order: node.order,
      });
    }
  }

  return sources;
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
