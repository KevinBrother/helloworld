import { memo, useEffect, useMemo, useState } from "react";
import {
  Download,
  FileJson,
  FileUp,
  Layers3,
  LayoutList,
  RotateCcw,
  SquarePen,
  SplitSquareHorizontal,
  ClipboardList,
} from "lucide-react";
import {
  Background,
  BaseEdge,
  Controls,
  EdgeLabelRenderer,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  getBezierPath,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
// import sampleDocument from "./sample-ui-node.json";
import sampleDocument from "../../../output/calculator-ui-node.json";
import type { EditOperation, InspectorField, UIDocument, UINode } from "./types";

type ViewMode = "outline" | "canvas" | "operations";
type WorkflowNodeData = {
  uiNode: UINode;
  ghost?: boolean;
  branchLabel?: string;
} & Record<string, unknown>;
type WorkflowFlowNode = Node<WorkflowNodeData, "workflow">;
type WorkflowFlowEdge = Edge<Record<string, unknown>, "workflow">;
type Measure = {
  width: number;
  height: number;
};

const nodeTypes = {
  workflow: memo(WorkflowFlowNode),
};

const edgeTypes = {
  workflow: WorkflowFlowEdge,
};

const NODE_WIDTH = 286;
const NODE_HEIGHT = 104;
const GAP_Y = 118;
const GAP_X = 88;

const DEFAULT_ACTOR = {
  id: "local-user",
  name: "Local Editor",
  kind: "human",
};

function App() {
  const [uiDocument, setUIDocument] = useState<UIDocument>(() => sampleDocument as UIDocument);
  const [selectedNodeId, setSelectedNodeId] = useState<string>(() => sampleDocument.root.id);
  const [operationLog, setOperationLog] = useState<EditOperation[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("canvas");
  const [status, setStatus] = useState("Sample loaded");
  const [metadataDraft, setMetadataDraft] = useState("");

  const selectedNode = useMemo(
    () => findNode(uiDocument.root, selectedNodeId) ?? uiDocument.root,
    [uiDocument, selectedNodeId],
  );

  useEffect(() => {
    setMetadataDraft(readEditableValue(selectedNode));
  }, [selectedNode]);

  const outline = useMemo(() => flattenNodes(uiDocument.root), [uiDocument]);

  const emitOperation = (operation: EditOperation) => {
    setOperationLog((current) => [operation, ...current].slice(0, 50));
    setStatus(`${operation.type} queued for ${operation.targetNodeId ?? "document"}`);
  };

  const handleToggleCollapsed = () => {
    const nextCollapsed = !selectedNode.collapsed;
    emitOperation({
      schemaVersion: "1.0.0",
      operationId: makeOperationId("toggle"),
      type: "toggleCollapsed",
      targetNodeId: selectedNode.id,
      payload: { collapsed: nextCollapsed },
      actor: DEFAULT_ACTOR,
    });
    setUIDocument((current) => updateNode(current, selectedNode.id, (node) => ({ ...node, collapsed: nextCollapsed })));
  };

  const handleApplyMetadata = () => {
    const path = "metadata.ui.note";
    emitOperation({
      schemaVersion: "1.0.0",
      operationId: makeOperationId("update"),
      type: "updateField",
      targetNodeId: selectedNode.id,
      path,
      payload: { value: metadataDraft },
      actor: DEFAULT_ACTOR,
    });
    setUIDocument((current) =>
      updateNode(current, selectedNode.id, (node) => updateNodeMetadata(node, "ui.note", metadataDraft)),
    );
  };

  const handleFileLoad = async (file: File) => {
    const raw = await file.text();
    const next = JSON.parse(raw) as UIDocument;
    setUIDocument(next);
    setSelectedNodeId(next.root.id);
    setOperationLog([]);
    setStatus(`Loaded ${file.name}`);
  };

  const handleDownloadOperations = () => {
    const payload = JSON.stringify(operationLog, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = globalThis.document.createElement("a");
    anchor.href = url;
    anchor.download = "edit-operation.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <div className="eyebrow">Structured Workflow Editor</div>
          <h1>{uiDocument.workflowId}</h1>
        </div>
        <div className="topbar-actions">
          <button
            className="icon-button"
            onClick={() => {
              const next = sampleDocument as UIDocument;
              setUIDocument(next);
              setSelectedNodeId(next.root.id);
              setOperationLog([]);
              setStatus("Sample loaded");
            }}
          >
            <RotateCcw size={16} />
            Reset
          </button>
          <label className="icon-button file-button">
            <FileUp size={16} />
            Load JSON
            <input
              type="file"
              accept="application/json"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void handleFileLoad(file);
                }
              }}
            />
          </label>
          <button className="icon-button" onClick={handleDownloadOperations} disabled={operationLog.length === 0}>
            <Download size={16} />
            Export ops
          </button>
        </div>
      </header>

      <section className="statusbar">
        <div className="status-pill">{status}</div>
        <div className="status-pill">{operationLog.length} operations</div>
        <div className="status-pill">{selectedNode.kind}</div>
      </section>

      <main className="workspace">
        <aside className="panel outline-panel">
          <div className="panel-title">
            <LayoutList size={16} />
            Outline
          </div>
          <NodeOutline nodes={outline} selectedId={selectedNodeId} onSelect={setSelectedNodeId} />
        </aside>

        <section className="panel canvas-panel">
          <div className="panel-header">
            <div className="panel-title">
              <Layers3 size={16} />
              Canvas
            </div>
            <div className="mode-switch">
              {(["outline", "canvas", "operations"] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  className={mode === viewMode ? "mode-button active" : "mode-button"}
                  onClick={() => setViewMode(mode)}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
          <div className="canvas-scroll">
            {viewMode === "operations" ? (
              <OperationsFeed operations={operationLog} />
            ) : viewMode === "outline" ? (
              <NodeOutline nodes={outline} selectedId={selectedNodeId} onSelect={setSelectedNodeId} />
            ) : (
              <WorkflowCanvas node={uiDocument.root} selectedId={selectedNodeId} onSelect={setSelectedNodeId} />
            )}
          </div>
        </section>

        <aside className="panel inspector-panel">
          <div className="panel-title">
            <SquarePen size={16} />
            Inspector
          </div>
          <InspectorPane
            node={selectedNode}
            draftValue={metadataDraft}
            onDraftValueChange={setMetadataDraft}
            onToggleCollapsed={handleToggleCollapsed}
            onApplyMetadata={handleApplyMetadata}
            onSelect={setSelectedNodeId}
          />
        </aside>
      </main>
    </div>
  );
}

function NodeOutline({
  nodes,
  selectedId,
  onSelect,
  depth = 0,
}: {
  nodes: UINode[];
  selectedId: string;
  onSelect: (id: string) => void;
  depth?: number;
}) {
  return (
    <div className="outline-tree">
      {nodes.map((node) => (
        <button
          key={node.id}
          className={node.id === selectedId ? "outline-item selected" : "outline-item"}
          style={{ paddingLeft: `${0.75 + depth * 0.9}rem` }}
          onClick={() => onSelect(node.id)}
        >
          <span className="outline-kind">{node.kind}</span>
          <span className="outline-label">{node.label ?? node.id}</span>
        </button>
      ))}
    </div>
  );
}

function WorkflowCanvas({
  node,
  selectedId,
  onSelect,
}: {
  node: UINode;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const graph = useMemo(() => buildFlowGraph(node, selectedId), [node, selectedId]);
  return (
    <div className="flow-pane">
      <ReactFlow
        nodes={graph.nodes}
        edges={graph.edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        edgesFocusable={false}
        nodesFocusable={false}
        edgesReconnectable={false}
        elementsSelectable
        deleteKeyCode={null}
        fitView
        fitViewOptions={{ padding: 0.18 }}
        minZoom={0.45}
        maxZoom={1.4}
        onNodeClick={(_, flowNode) => {
          if (!flowNode.data.ghost) {
            onSelect(flowNode.data.uiNode.id);
          }
        }}
      >
        <Background color="#c9d8d5" gap={22} size={1} />
        <Controls showInteractive={false} />
        <MiniMap
          pannable
          zoomable
          nodeColor={(miniNode) => (miniNode.id === selectedId ? "#4c9b94" : "#bfd3ce")}
          maskColor="rgba(245, 247, 244, 0.62)"
        />
      </ReactFlow>
    </div>
  );
}

function NodeCard({
  node,
  selectedId,
  onSelect,
}: {
  node: UINode;
  selectedId: string;
  onSelect?: (id: string) => void;
}) {
  const selected = node.id === selectedId;
  return (
    <article className={selected ? "node-card selected" : "node-card"} onClick={() => onSelect?.(node.id)}>
      <div className="node-head">
        <div>
          <div className="node-label">{node.label ?? node.id}</div>
          <div className="node-meta">
            <span>{node.kind}</span>
            {node.path ? <span>{node.path}</span> : null}
          </div>
        </div>
        <div className="node-badges">
          {node.collapsed ? <span className="badge warn">collapsed</span> : null}
          {node.editable ? <span className="badge accent">editable</span> : null}
        </div>
      </div>
    </article>
  );
}

function WorkflowFlowNode({ data, selected }: NodeProps<WorkflowFlowNode>) {
  if (data.ghost) {
    return (
      <div className="branch-ghost">
        <Handle type="target" position={Position.Top} />
        <span>{data.branchLabel ?? "Empty branch"}</span>
      </div>
    );
  }

  return (
    <div className="flow-node-shell">
      <Handle type="target" position={Position.Top} />
      <NodeCard node={data.uiNode} selectedId={selected ? data.uiNode.id : ""} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

function WorkflowFlowEdge(props: EdgeProps<WorkflowFlowEdge>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition,
  });

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={props.markerEnd} style={props.style} />
      {props.label ? (
        <EdgeLabelRenderer>
          <div
            className="edge-label"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            }}
          >
            {props.label}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

function InspectorPane({
  node,
  draftValue,
  onDraftValueChange,
  onToggleCollapsed,
  onApplyMetadata,
  onSelect,
}: {
  node: UINode;
  draftValue: string;
  onDraftValueChange: (value: string) => void;
  onToggleCollapsed: () => void;
  onApplyMetadata: () => void;
  onSelect: (id: string) => void;
}) {
  const fields = node.inspector ?? [];
  return (
    <div className="inspector">
      <div className="inspector-block">
        <div className="inspector-title">Node</div>
        <div className="kv-grid">
          <div>
            <span>ID</span>
            <strong>{node.id}</strong>
          </div>
          <div>
            <span>Kind</span>
            <strong>{node.kind}</strong>
          </div>
          <div>
            <span>Path</span>
            <strong>{node.path ?? "root"}</strong>
          </div>
        </div>
      </div>

      <div className="inspector-block">
        <div className="inspector-title">Actions</div>
        <div className="button-stack">
          <button className="ghost-button" onClick={onToggleCollapsed}>
            <SplitSquareHorizontal size={16} />
            Toggle collapsed
          </button>
          <button className="ghost-button" onClick={onApplyMetadata}>
            <ClipboardList size={16} />
            Emit updateField
          </button>
          <button className="ghost-button" onClick={() => onSelect(node.id)}>
            <FileJson size={16} />
            Focus node
          </button>
        </div>
      </div>

      <div className="inspector-block">
        <div className="inspector-title">Metadata note</div>
        <textarea value={draftValue} onChange={(event) => onDraftValueChange(event.target.value)} rows={4} />
      </div>

      <div className="inspector-block">
        <div className="inspector-title">Inspector fields</div>
        <div className="field-list">
          {fields.map((field) => (
            <InspectorFieldRow key={field.path} field={field} />
          ))}
        </div>
      </div>
    </div>
  );
}

function InspectorFieldRow({ field }: { field: InspectorField }) {
  return (
    <div className="field-row">
      <div className="field-label">{field.label ?? field.path}</div>
      <div className="field-value">{renderFieldValue(field.value)}</div>
    </div>
  );
}

function OperationsFeed({ operations }: { operations: EditOperation[] }) {
  return (
    <div className="operations-feed">
      {operations.length === 0 ? <div className="empty-state">No edit operations emitted yet.</div> : null}
      {operations.map((operation) => (
        <article key={operation.operationId} className="operation-card">
          <div className="operation-head">
            <strong>{operation.type}</strong>
            <span>{operation.targetNodeId ?? "document"}</span>
          </div>
          <pre>{JSON.stringify(operation, null, 2)}</pre>
        </article>
      ))}
    </div>
  );
}

function findNode(node: UINode, id: string): UINode | null {
  if (node.id === id) {
    return node;
  }
  for (const child of node.children ?? []) {
    const found = findNode(child, id);
    if (found) {
      return found;
    }
  }
  for (const branch of node.branches ?? []) {
    for (const child of branch.children ?? []) {
      const found = findNode(child, id);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

function flattenNodes(node: UINode): UINode[] {
  const nodes = [node];
  for (const child of node.children ?? []) {
    nodes.push(...flattenNodes(child));
  }
  for (const branch of node.branches ?? []) {
    for (const child of branch.children ?? []) {
      nodes.push(...flattenNodes(child));
    }
  }
  return nodes;
}

function buildFlowGraph(root: UINode, selectedId: string): { nodes: WorkflowFlowNode[]; edges: WorkflowFlowEdge[] } {
  const nodes: WorkflowFlowNode[] = [];
  const edges: WorkflowFlowEdge[] = [];
  const measure = measureNode(root);
  placeNode(root, 32, 32, measure.width, selectedId, nodes, edges);
  return { nodes, edges };
}

function measureNode(node: UINode): Measure {
  if (node.collapsed) {
    return { width: NODE_WIDTH, height: NODE_HEIGHT };
  }

  const children = node.children ?? [];
  const branches = node.branches ?? [];
  if (branches.length > 0) {
    const branchMeasures = branches.map((branch) => measureSequence(branch.children ?? []));
    const width = Math.max(
      NODE_WIDTH,
      branchMeasures.reduce((total, branch, index) => total + branch.width + (index > 0 ? GAP_X : 0), 0),
    );
    return {
      width,
      height: NODE_HEIGHT + GAP_Y + Math.max(...branchMeasures.map((branch) => branch.height), NODE_HEIGHT),
    };
  }

  if (children.length > 0) {
    const sequence = measureSequence(children);
    return {
      width: Math.max(NODE_WIDTH, sequence.width),
      height: NODE_HEIGHT + GAP_Y + sequence.height,
    };
  }

  return { width: NODE_WIDTH, height: NODE_HEIGHT };
}

function measureSequence(nodes: UINode[]): Measure {
  if (nodes.length === 0) {
    return { width: NODE_WIDTH, height: NODE_HEIGHT * 0.72 };
  }
  const measures = nodes.map(measureNode);
  return {
    width: Math.max(NODE_WIDTH, ...measures.map((measure) => measure.width)),
    height: measures.reduce((total, measure, index) => total + measure.height + (index > 0 ? GAP_Y : 0), 0),
  };
}

function placeNode(
  node: UINode,
  x: number,
  y: number,
  width: number,
  selectedId: string,
  nodes: WorkflowFlowNode[],
  edges: WorkflowFlowEdge[],
) {
  const measured = measureNode(node);
  const nodeX = x + (width - NODE_WIDTH) / 2;
  nodes.push({
    id: node.id,
    type: "workflow",
    position: { x: nodeX, y },
    data: { uiNode: node },
    selected: node.id === selectedId,
    width: NODE_WIDTH,
    height: NODE_HEIGHT,
  });

  if (node.collapsed) {
    return measured;
  }

  const branches = node.branches ?? [];
  if (branches.length > 0) {
    placeBranches(node, x, y + NODE_HEIGHT + GAP_Y, measured.width, selectedId, nodes, edges);
    return measured;
  }

  const children = node.children ?? [];
  if (children.length > 0) {
    placeSequence(children, x, y + NODE_HEIGHT + GAP_Y, measured.width, selectedId, nodes, edges, node.id);
  }

  return measured;
}

function placeSequence(
  sequence: UINode[],
  x: number,
  y: number,
  width: number,
  selectedId: string,
  nodes: WorkflowFlowNode[],
  edges: WorkflowFlowEdge[],
  incomingId?: string,
  incomingLabel?: string,
) {
  let cursorY = y;
  let previousId = incomingId;

  sequence.forEach((child, index) => {
    const childMeasure = measureNode(child);
    placeNode(child, x + (width - childMeasure.width) / 2, cursorY, childMeasure.width, selectedId, nodes, edges);
    if (previousId) {
      edges.push(makeEdge(previousId, child.id, index === 0 ? incomingLabel : undefined));
    }
    previousId = child.id;
    cursorY += childMeasure.height + GAP_Y;
  });
}

function placeBranches(
  node: UINode,
  x: number,
  y: number,
  width: number,
  selectedId: string,
  nodes: WorkflowFlowNode[],
  edges: WorkflowFlowEdge[],
) {
  const branches = node.branches ?? [];
  const measures = branches.map((branch) => measureSequence(branch.children ?? []));
  const totalWidth = measures.reduce((total, measure, index) => total + measure.width + (index > 0 ? GAP_X : 0), 0);
  let cursorX = x + (width - totalWidth) / 2;

  branches.forEach((branch, index) => {
    const branchMeasure = measures[index];
    const branchLabel = branch.label ?? branch.kind ?? branch.id;
    if (branch.children?.length) {
      placeSequence(branch.children, cursorX, y, branchMeasure.width, selectedId, nodes, edges, node.id, branchLabel);
    } else {
      const ghostId = `${node.id}::${branch.id}`;
      nodes.push({
        id: ghostId,
        type: "workflow",
        position: { x: cursorX + (branchMeasure.width - NODE_WIDTH) / 2, y },
        data: {
          ghost: true,
          branchLabel,
          uiNode: {
            id: ghostId,
            kind: "branch",
            label: "No steps",
          },
        },
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      });
      edges.push(makeEdge(node.id, ghostId, branchLabel));
    }
    cursorX += branchMeasure.width + GAP_X;
  });
}

function makeEdge(source: string, target: string, label?: string): WorkflowFlowEdge {
  return {
    id: `${source}->${target}`,
    type: "workflow",
    source,
    target,
    label,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 16,
      height: 16,
      color: "#4c9b94",
    },
    style: {
      stroke: "#4c9b94",
      strokeWidth: 1.8,
    },
  };
}

function updateNode(document: UIDocument, id: string, updater: (node: UINode) => UINode): UIDocument {
  return {
    ...document,
    root: updateNodeRecursive(document.root, id, updater),
  };
}

function updateNodeRecursive(node: UINode, id: string, updater: (node: UINode) => UINode): UINode {
  if (node.id === id) {
    return updater(node);
  }
  const children = node.children?.map((child) => updateNodeRecursive(child, id, updater));
  const branches = node.branches?.map((branch) => ({
    ...branch,
    children: branch.children?.map((child) => updateNodeRecursive(child, id, updater)),
  }));
  return {
    ...node,
    children,
    branches,
  };
}

function updateNodeMetadata(node: UINode, path: string, value: string): UINode {
  const [head, ...rest] = path.split(".");
  const metadata = { ...(node.metadata ?? {}) };
  if (rest.length === 0) {
    metadata[head] = value;
  } else {
    const current = (metadata[head] as Record<string, unknown> | undefined) ?? {};
    let cursor: Record<string, unknown> = current;
    for (let i = 0; i < rest.length - 1; i += 1) {
      const key = rest[i];
      const next = (cursor[key] as Record<string, unknown> | undefined) ?? {};
      cursor[key] = next;
      cursor = next;
    }
    cursor[rest[rest.length - 1]] = value;
    metadata[head] = current;
  }
  return { ...node, metadata };
}

function readEditableValue(node: UINode): string {
  const note = node.metadata?.ui && typeof node.metadata.ui === "object" ? (node.metadata.ui as Record<string, unknown>).note : undefined;
  return typeof note === "string" ? note : "";
}

function makeOperationId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function renderFieldValue(value: unknown) {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value == null) {
    return "-";
  }
  return JSON.stringify(value);
}

export default App;
