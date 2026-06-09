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

export type WorkbenchParameterRow = {
  id: string;
  direction: "input" | "output";
  name: string;
  type: FieldType;
  nameEditable: boolean;
  typeEditable: boolean;
  valueEditable: boolean;
  custom: boolean;
  value?: unknown;
  valuePath?: string;
  portPath?: string;
  field?: WorkbenchField;
  port?: WorkbenchPort;
  allowReference: boolean;
  allowDelete: boolean;
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
  inputRows: WorkbenchParameterRow[];
  outputRows: WorkbenchParameterRow[];
  allowCustomInput: boolean;
  allowCustomOutput: boolean;
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

export type CanvasLayoutNodeRole = "statement" | "branchHeader" | "join" | "emptyBranch";

export type CanvasLayoutNode = {
  id: string;
  role: CanvasLayoutNodeRole;
  node?: WorkbenchNode;
  label?: string;
  branchId?: string;
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

export type CanvasInsertControl = {
  id: string;
  kind: "insertNode" | "insertBranch";
  label: string;
  x: number;
  y: number;
  anchor?: InsertAnchor;
  nodeId?: string;
  branchKind?: "condition" | "parallel";
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
  insertControls: CanvasInsertControl[];
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
const CANVAS_BRANCH_LANE_GAP_X = 320;
const CANVAS_BRANCH_HEADER_WIDTH = 180;
const CANVAS_BRANCH_HEADER_HEIGHT = 42;
const CANVAS_EMPTY_BRANCH_WIDTH = 220;
const CANVAS_EMPTY_BRANCH_HEIGHT = 74;
const CANVAS_BRANCH_HEADER_GAP_Y = 62;
const CANVAS_BRANCH_NODE_GAP_Y = 54;

export function buildWorkbenchModel(document: UIDocument, blockCatalog: BlockDefinition[] = []): WorkbenchModel {
  const blockCatalogById = new Map(blockCatalog.map((definition) => [definition.id, definition]));
  const nodes = flattenWorkbenchNodes(document.root, workflowInputValuesFromDocument(document), rootWorkflowOutputPorts(document.root), blockCatalogById);
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
  const insertControls: CanvasInsertControl[] = [];
  const placedStatements = new Set<string>();
  const hasBranches = model.nodes.some((node) => (node.kind === "if" || node.kind === "parallel") && node.raw.branches?.length);
  const requiredBranchWidth = getFlowLaneSlotWidth(model.root.children ?? []) + CANVAS_NODE_WIDTH;
  const canvasWidth = hasBranches ? Math.max(CANVAS_BRANCH_WIDTH, requiredBranchWidth) : CANVAS_LINEAR_WIDTH;
  const canvasCenterX = canvasWidth / 2;

  type PreviousPoint = {
    visualId: string;
    astAfterNodeId: string;
    position?: InsertAnchor["position"];
    anchor?: InsertAnchor;
  };

  const placeStatementNode = (uiNode: UINode, x: number, y: number) => {
    const node = nodeById.get(uiNode.id);
    if (!node || placedStatements.has(uiNode.id)) return undefined;
    placedStatements.add(uiNode.id);
    const layoutNode = { id: uiNode.id, role: "statement" as const, node, x, y, width: CANVAS_NODE_WIDTH, height: CANVAS_NODE_HEIGHT };
    layoutNodes.push(layoutNode);
    return layoutNode;
  };

  const addEdge = (from: string, to: string, anchor: InsertAnchor) => {
    if (from === to) return;
    edges.push({ id: `${from}->${to}`, from, to, anchor });
  };

  const isBranchContainer = (uiNode: UINode) => (uiNode.kind === "if" || uiNode.kind === "parallel") && Boolean(uiNode.branches?.length);

  const connectPrevious = (previous: PreviousPoint[], toNodeId: string, containerNodeId: string) => {
    for (const point of previous) {
      const anchor: InsertAnchor = point.anchor
        ? { ...point.anchor }
        : {
            afterNodeId: point.astAfterNodeId,
            beforeNodeId: toNodeId,
            containerNodeId,
          };
      if (!point.anchor && point.position) anchor.position = point.position;
      addEdge(point.visualId, toNodeId, anchor);
      if (anchor.position === "afterJoin") {
        const fromNode = layoutNodes.find((node) => node.id === point.visualId);
        const toNode = layoutNodes.find((node) => node.id === toNodeId);
        insertControls.push({
          id: `insert:${point.astAfterNodeId}->${toNodeId}`,
          kind: "insertNode",
          label: "继续追加",
          x: Math.round(((fromNode?.x ?? canvasCenterX) + (toNode?.x ?? canvasCenterX)) / 2),
          y: Math.round(((fromNode?.y ?? 0) + (toNode?.y ?? 0)) / 2),
          anchor,
        });
      }
    }
  };

  const layoutFlowNode = (uiNode: UINode, previous: PreviousPoint[], x: number, y: number, containerNodeId: string): { previous: PreviousPoint[]; nextY: number } => {
    if (isBranchContainer(uiNode)) {
      return layoutBranchNode(uiNode, previous, x, y, containerNodeId);
    }

    placeStatementNode(uiNode, x, y);
    connectPrevious(previous, uiNode.id, containerNodeId);
    return {
      previous: [{ visualId: uiNode.id, astAfterNodeId: uiNode.id }],
      nextY: y + CANVAS_STEP_Y,
    };
  };

  const layoutBranchNode = (uiNode: UINode, previous: PreviousPoint[], x: number, y: number, containerNodeId: string) => {
    placeStatementNode(uiNode, x, y);
    connectPrevious(previous, uiNode.id, containerNodeId);

    const branches = uiNode.branches ?? [];
    insertControls.push({
      id: `branch:${uiNode.id}:add`,
      kind: "insertBranch",
      label: uiNode.kind === "parallel" ? "新增并行分支" : "新增条件分支",
      x,
      y: y + CANVAS_NODE_HEIGHT + 34,
      nodeId: uiNode.id,
      branchKind: uiNode.kind === "parallel" ? "parallel" : "condition",
    });

    const headerY = y + CANVAS_NODE_HEIGHT + CANVAS_BRANCH_HEADER_GAP_Y;
    const firstChildY = headerY + CANVAS_BRANCH_HEADER_HEIGHT + CANVAS_BRANCH_NODE_GAP_Y;
    const laneXs = getBranchLaneCenters(branches, x);
    const joinId = `${uiNode.id}:join`;
    const branchEnds: PreviousPoint[] = [];
    let branchBottom = firstChildY + CANVAS_EMPTY_BRANCH_HEIGHT;

    branches.forEach((branch, branchIndex) => {
      const laneX = laneXs[branchIndex] ?? x;
      const headerId = `${uiNode.id}:${branch.id}:header`;
      layoutNodes.push({
        id: headerId,
        role: "branchHeader",
        label: branch.label ?? branch.kind ?? `分支 ${branchIndex + 1}`,
        branchId: branch.id,
        x: laneX,
        y: headerY,
        width: CANVAS_BRANCH_HEADER_WIDTH,
        height: CANVAS_BRANCH_HEADER_HEIGHT,
      });
      addEdge(uiNode.id, headerId, { containerNodeId: uiNode.id, branchId: branch.id, position: "branchStart" });

      const children = branch.children ?? [];
      if (children.length === 0) {
        const emptyId = `${uiNode.id}:${branch.id}:empty`;
        layoutNodes.push({
          id: emptyId,
          role: "emptyBranch",
          label: "空分支",
          branchId: branch.id,
          x: laneX,
          y: firstChildY,
          width: CANVAS_EMPTY_BRANCH_WIDTH,
          height: CANVAS_EMPTY_BRANCH_HEIGHT,
        });
        insertControls.push({
          id: `insert:${uiNode.id}:${branch.id}:empty`,
          kind: "insertNode",
          label: "分支开头插入",
          x: laneX,
          y: firstChildY + CANVAS_EMPTY_BRANCH_HEIGHT / 2,
          anchor: { containerNodeId: uiNode.id, branchId: branch.id, position: "branchStart" },
        });
        addEdge(headerId, emptyId, { containerNodeId: uiNode.id, branchId: branch.id, position: "branchStart" });
        branchEnds.push({ visualId: emptyId, astAfterNodeId: uiNode.id });
        branchBottom = Math.max(branchBottom, firstChildY + CANVAS_EMPTY_BRANCH_HEIGHT);
        return;
      }

      insertControls.push({
        id: `insert:${uiNode.id}:${branch.id}:start`,
        kind: "insertNode",
        label: "分支开头插入",
        x: laneX,
        y: Math.round((headerY + CANVAS_BRANCH_HEADER_HEIGHT + firstChildY) / 2),
        anchor: { containerNodeId: uiNode.id, branchId: branch.id, position: "branchStart" },
      });

      let cursorY = firstChildY;
      let branchPrevious: PreviousPoint[] = [{ visualId: headerId, astAfterNodeId: uiNode.id }];
      children.forEach((child, childIndex) => {
        const anchorForInsert: InsertAnchor =
          childIndex === 0
            ? { containerNodeId: uiNode.id, branchId: branch.id, position: "branchStart" }
            : {
                containerNodeId: uiNode.id,
                branchId: branch.id,
                position: "between",
                afterNodeId: branchPrevious[0]?.astAfterNodeId,
                beforeNodeId: child.id,
              };

        if (childIndex > 0) {
          insertControls.push({
            id: `insert:${branchPrevious[0]?.astAfterNodeId}->${child.id}`,
            kind: "insertNode",
            label: "分支中间插入",
            x: laneX,
            y: cursorY - CANVAS_STEP_GAP_Y / 2,
            anchor: anchorForInsert,
          });
        }

        const connectionPrevious = branchPrevious.map((point) => ({
          ...point,
          anchor:
            childIndex === 0
              ? { containerNodeId: uiNode.id, branchId: branch.id, position: "branchStart" as const }
              : {
                  containerNodeId: uiNode.id,
                  branchId: branch.id,
                  position: "between" as const,
                  afterNodeId: point.astAfterNodeId,
                  beforeNodeId: child.id,
                },
        }));
        const result = layoutFlowNode(child, connectionPrevious, laneX, cursorY, uiNode.id);
        branchPrevious = result.previous;
        cursorY = result.nextY;
      });

      insertControls.push({
        id: `insert:${uiNode.id}:${branch.id}:end`,
        kind: "insertNode",
        label: "分支末尾追加",
        x: laneX,
        y: cursorY - CANVAS_STEP_GAP_Y / 2,
        anchor: { containerNodeId: uiNode.id, branchId: branch.id, position: "branchEnd" },
      });
      branchEnds.push(...branchPrevious);
      branchBottom = Math.max(branchBottom, cursorY - CANVAS_STEP_GAP_Y + CANVAS_BRANCH_NODE_GAP_Y);
    });

    const joinY = branchBottom + CANVAS_BRANCH_HEADER_GAP_Y;
    layoutNodes.push({ id: joinId, role: "join", x, y: joinY, width: 0, height: 0 });
    for (const endPoint of branchEnds) {
      addEdge(endPoint.visualId, joinId, { containerNodeId: uiNode.id, position: "branchEnd" });
    }

    return {
      previous: [{ visualId: joinId, astAfterNodeId: uiNode.id, position: "afterJoin" as const }],
      nextY: joinY + CANVAS_STEP_GAP_Y,
    };
  };

  placeStatementNode(model.root, canvasCenterX, CANVAS_START_Y);

  let previous: PreviousPoint[] = [{ visualId: model.root.id, astAfterNodeId: model.root.id }];
  let cursorY = CANVAS_START_Y + CANVAS_STEP_Y;

  for (const child of model.root.children ?? []) {
    const result = layoutFlowNode(child, previous, canvasCenterX, cursorY, model.root.id);
    previous = result.previous;
    cursorY = result.nextY;
  }

  for (const node of model.nodes) {
    if (!placedStatements.has(node.id)) {
      layoutNodes.push({ id: node.id, role: "statement", node, x: canvasCenterX, y: cursorY, width: CANVAS_NODE_WIDTH, height: CANVAS_NODE_HEIGHT });
      placedStatements.add(node.id);
      connectPrevious(previous, node.id, model.root.id);
      previous = [{ visualId: node.id, astAfterNodeId: node.id }];
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
    insertControls,
  };
}

function getBranchLaneCenters(branches: NonNullable<UINode["branches"]>, centerX: number) {
  if (branches.length <= 1) return [centerX];
  const laneSlotWidths = branches.map(getBranchLaneSlotWidth);
  const totalWidth = laneSlotWidths.reduce((sum, width) => sum + width, 0);
  let cursorX = centerX - totalWidth / 2;
  return laneSlotWidths.map((width) => {
    const laneCenterX = cursorX + width / 2;
    cursorX += width;
    return laneCenterX;
  });
}

function getFlowLaneSlotWidth(nodes: UINode[]) {
  return Math.max(CANVAS_BRANCH_LANE_GAP_X, ...nodes.map(getNodeLaneSlotWidth));
}

function getNodeLaneSlotWidth(node: UINode): number {
  if ((node.kind === "if" || node.kind === "parallel") && node.branches?.length) {
    return Math.max(CANVAS_BRANCH_LANE_GAP_X, node.branches.map(getBranchLaneSlotWidth).reduce((sum, width) => sum + width, 0));
  }
  return CANVAS_BRANCH_LANE_GAP_X;
}

function getBranchLaneSlotWidth(branch: NonNullable<UINode["branches"]>[number]) {
  return getFlowLaneSlotWidth(branch.children ?? []);
}

function flattenWorkbenchNodes(
  root: UINode,
  workflowInputValues: WorkflowInputValues,
  workflowOutputPorts: WorkbenchPort[],
  blockCatalogById: Map<string, BlockDefinition>,
) {
  const nodes: WorkbenchNode[] = [];

  const visit = (node: UINode, branch?: string) => {
    nodes.push(toWorkbenchNode(node, nodes.length, branch, workflowInputValues, workflowOutputPorts, blockCatalogById));
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
  blockCatalogById: Map<string, BlockDefinition>,
): WorkbenchNode {
  const fields = node.inspector ?? [];
  const blockDefinition = node.kind === "callBlock" ? blockCatalogById.get(node.label ?? "") : undefined;
  const inputPorts = fields.filter(isWorkflowInputPortField).map(toWorkbenchPort);
  const outputPorts = fields.filter(isWorkflowOutputPortField).map(toWorkbenchPort);
  const inputs = fields
    .filter(isInputField)
    .flatMap((field) => toInputFields(field, order === 0 && node.kind === "sequence", workflowInputValues, blockDefinition));
  const outputs = mergeWorkbenchFields(
    fields.filter(isOutputField).map((field) => toWorkbenchField(field, false, false)),
    metadataOutputFields(node),
  );
  const allowCustomInput = metadataFlag(node.metadata, "allowCustomInput");
  const allowCustomOutput = metadataFlag(node.metadata, "allowCustomOutput");
  const nodeOutputPorts =
    node.kind === "return" && outputPorts.length === 0
      ? workflowOutputPorts.length > 0
        ? workflowOutputPorts
        : outputs.map(outputPortFromReturnField)
      : outputPorts;

  const inputRows = buildParameterRows("input", node, inputs, inputPorts, allowCustomInput);
  const outputRows = buildParameterRows("output", node, outputs, nodeOutputPorts, allowCustomOutput);

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
    inputRows,
    outputRows,
    allowCustomInput,
    allowCustomOutput,
    deletable: isNodeDeletable(node, order),
    deleteMessage: getDeleteMessage(node, order),
    hasNestedChildren: hasNestedChildren(node),
  };
}

function buildParameterRows(
  direction: "input" | "output",
  node: UINode,
  fields: WorkbenchField[],
  ports: WorkbenchPort[],
  allowCustom: boolean,
): WorkbenchParameterRow[] {
  const fieldsByKey = new Map(fields.map((field) => [field.key, field]));
  const rows: WorkbenchParameterRow[] = [];

  for (const port of ports) {
    const field = fieldsByKey.get(port.key);
    rows.push(parameterRowFromPort(direction, node, port, field, allowCustom));
    if (field) fieldsByKey.delete(port.key);
  }

  for (const field of fieldsByKey.values()) {
    rows.push(parameterRowFromField(direction, node, field));
  }

  return rows;
}

function mergeWorkbenchFields(primary: WorkbenchField[], fallback: WorkbenchField[]) {
  const merged = [...primary];
  const keys = new Set(primary.map((field) => field.key));
  for (const field of fallback) {
    if (!keys.has(field.key)) {
      merged.push(field);
      keys.add(field.key);
    }
  }
  return merged;
}

function parameterRowFromPort(
  direction: "input" | "output",
  node: UINode,
  port: WorkbenchPort,
  field: WorkbenchField | undefined,
  allowCustom: boolean,
): WorkbenchParameterRow {
  const returnOutput = node.kind === "return" && direction === "output";
  const workflowStartInput = node.kind === "sequence" && direction === "input";
  return {
    id: `${direction}:${port.path}`,
    direction,
    name: port.key,
    type: port.type,
    nameEditable: allowCustom,
    typeEditable: allowCustom,
    valueEditable: Boolean(field && !field.readonly),
    custom: allowCustom,
    value: field?.value,
    valuePath: field?.path ?? port.path,
    portPath: port.path,
    field,
    port,
    allowReference: Boolean(field && !workflowStartInput && (returnOutput || field.control === "reference" || field.control === "expression")),
    allowDelete: allowCustom,
  };
}

function parameterRowFromField(direction: "input" | "output", node: UINode, field: WorkbenchField): WorkbenchParameterRow {
  const returnOutput = node.kind === "return" && direction === "output";
  return {
    id: `${direction}:${field.path}`,
    direction,
    name: field.key,
    type: field.type,
    nameEditable: false,
    typeEditable: false,
    valueEditable: !field.readonly,
    custom: false,
    value: field.value,
    valuePath: field.path,
    field,
    allowReference: !field.readonly && (returnOutput || field.control === "reference" || field.control === "expression"),
    allowDelete: false,
  };
}

function metadataFlag(metadata: UINode["metadata"], key: string) {
  return metadata?.[key] === true;
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

function outputPortFromReturnField(field: WorkbenchField): WorkbenchPort {
  const type = field.type === "unknown" ? "string" : field.type;
  return {
    key: field.key,
    label: field.key,
    type,
    path: `$.outputs.${field.key}`,
    value: {
      name: field.key,
      type: {
        name: type,
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

function toInputFields(
  field: InspectorField,
  editableWorkflowInput = false,
  workflowInputValues: WorkflowInputValues = {},
  blockDefinition?: BlockDefinition,
): WorkbenchField[] {
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

  return [applyBlockInputType(toWorkbenchField(field, editableWorkflowInput, false, workflowInputValues), blockDefinition)];
}

function applyBlockInputType(field: WorkbenchField, blockDefinition: BlockDefinition | undefined): WorkbenchField {
  const port = blockDefinition?.inputs?.find((input) => input.name === field.key);
  if (!port) return field;
  return {
    ...field,
    type: normalizeType(port.type.name),
  };
}

function metadataOutputFields(node: UINode): WorkbenchField[] {
  const outputs = metadataRecords(node.metadata, "outputs");
  if (outputs.length === 0) return [];

  return outputs.flatMap((output) => {
    const name = metadataOutputName(output);
    if (!name) return [];
    return [
      {
        key: name,
        label: name,
        type: normalizeType(typeof output.type === "string" ? output.type : ""),
        control: "readonly" as const,
        path: `${node.path ?? node.id}.outputs.${name}`,
        value: undefined,
        readonly: true,
      },
    ];
  });
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

  const ref = expressionRef(field.value);
  if (ref) {
    const tokenType = tokenTypeForRef(field.metadata, ref);
    if (tokenType) return tokenType;
  }

  if (isExpressionRecord(field.value) && field.value.kind === "literal") {
    const literalValue = field.value.value;
    if (typeof literalValue === "number") return "number";
    if (typeof literalValue === "boolean") return "boolean";
    if (typeof literalValue === "string") return "string";
    if (Array.isArray(literalValue)) return "array";
    if (isRecord(literalValue)) return "object";
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

function tokenTypeForRef(metadata: InspectorField["metadata"], ref: string): FieldType | undefined {
  for (const token of metadataRecords(metadata, "availableTokens")) {
    if (token.ref === ref && typeof token.type === "string") {
      return normalizeType(token.type);
    }
  }
  return undefined;
}

function metadataRecords(metadata: Record<string, unknown> | undefined, key: string): Record<string, unknown>[] {
  const value = metadata?.[key];
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord);
}

function metadataOutputName(output: Record<string, unknown>) {
  if (typeof output.ref === "string") {
    return output.ref.split(".").at(-1) ?? "";
  }
  if (typeof output.label === "string") {
    return output.label.split(".").at(-1) ?? normalizeKey(output.label);
  }
  return "";
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
  if (value === "array") return "array";
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
