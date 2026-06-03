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
  Play,
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
import type {
  Diagnostic,
  EditOperation,
  EditorStateResponse,
  InspectorField,
  RunResult,
  RunResponse,
  UIDocument,
  UINode,
} from "./types";

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
type LiteralInputType = "string" | "number" | "boolean";
type SaveState = "sample" | "saved" | "saving" | "failed";
type WorkbenchTab = "properties" | "run" | "diagnostics";

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
  const [astDocument, setASTDocument] = useState<unknown>(null);
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
  const [serverAvailable, setServerAvailable] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string>(() => sampleDocument.root.id);
  const [operationLog, setOperationLog] = useState<EditOperation[]>([]);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [runPending, setRunPending] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("sample");
  const [activeWorkbenchTab, setActiveWorkbenchTab] = useState<WorkbenchTab>("properties");
  const [viewMode, setViewMode] = useState<ViewMode>("canvas");
  const [status, setStatus] = useState("Sample loaded");

  const selectedNode = useMemo(
    () => findNode(uiDocument.root, selectedNodeId) ?? uiDocument.root,
    [uiDocument, selectedNodeId],
  );

  useEffect(() => {
    let cancelled = false;
    async function loadWorkflow() {
      try {
        const state = await requestJSON<EditorStateResponse>("/api/workflow");
        if (cancelled) {
          return;
        }
        applyServerState(state);
        setServerAvailable(true);
        setSaveState("saved");
        setStatus("Workflow service connected");
      } catch (error) {
        if (cancelled) {
          return;
        }
        setServerAvailable(false);
        setStatus(`Using sample projection (${formatError(error)})`);
      }
    }
    void loadWorkflow();
    return () => {
      cancelled = true;
    };
  }, []);

  const outline = useMemo(() => flattenNodes(uiDocument.root), [uiDocument]);

  const emitOperation = (operation: EditOperation, message?: string) => {
    setOperationLog((current) => [operation, ...current].slice(0, 50));
    setStatus(message ?? `${operation.type} saved for ${operation.targetNodeId ?? "document"}`);
  };

  const applyServerState = (state: EditorStateResponse) => {
    setASTDocument(state.ast);
    setUIDocument(state.ui);
    setDiagnostics(state.diagnostics ?? []);
    setSelectedNodeId((current) => (findNode(state.ui.root, current) ? current : state.ui.root.id));
  };

  const submitOperation = async (operation: EditOperation) => {
    if (!serverAvailable) {
      setStatus("Workflow service unavailable; edit not saved");
      return false;
    }

    setSaveState("saving");
    try {
      const state = await requestJSON<EditorStateResponse>("/api/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(operation),
      });
      applyServerState(state);
      setSaveState("saved");
      setServerAvailable(true);
      emitOperation(state.operation ?? operation);
      return true;
    } catch (error) {
      const apiError = normalizeAPIError(error);
      setSaveState("failed");
      setDiagnostics(apiError.diagnostics);
      if (apiError.network) {
        setServerAvailable(false);
      }
      setStatus(apiError.message);
      return false;
    }
  };

  const handleToggleCollapsed = () => {
    const nextCollapsed = !selectedNode.collapsed;
    const operation: EditOperation = {
      schemaVersion: "1.0.0",
      operationId: makeOperationId("toggle"),
      type: "toggleCollapsed",
      targetNodeId: selectedNode.id,
      payload: { collapsed: nextCollapsed },
      actor: DEFAULT_ACTOR,
    };
    if (serverAvailable) {
      void submitOperation(operation);
      return;
    }
    emitOperation(operation);
    setUIDocument((current) => updateNode(current, selectedNode.id, (node) => ({ ...node, collapsed: nextCollapsed })));
  };

  const handleApplyExpression = (field: InspectorField, value: unknown) => {
    void submitOperation({
      schemaVersion: "1.0.0",
      operationId: makeOperationId("update"),
      type: "updateField",
      targetNodeId: selectedNode.id,
      path: field.path,
      payload: { value },
      actor: DEFAULT_ACTOR,
    });
  };

  const handleRunWorkflow = async () => {
    if (!serverAvailable) {
      setStatus("Workflow service unavailable; run disabled");
      return;
    }
    setRunPending(true);
    setDiagnostics([]);
    try {
      const payload = await requestJSON<RunResponse>("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      setRunResult(payload.result ?? null);
      setDiagnostics(payload.diagnostics ?? []);
      setActiveWorkbenchTab("run");
      setStatus("Run completed");
    } catch (error) {
      const apiError = normalizeAPIError(error);
      setRunResult(null);
      setDiagnostics(apiError.diagnostics);
      setActiveWorkbenchTab(apiError.diagnostics.length > 0 ? "diagnostics" : "run");
      if (apiError.network) {
        setServerAvailable(false);
      }
      setStatus(apiError.message);
    } finally {
      setRunPending(false);
    }
  };

  const handleFileLoad = async (file: File) => {
    const raw = await file.text();
    const next = JSON.parse(raw) as UIDocument;
    setUIDocument(next);
    setASTDocument(null);
    setDiagnostics([]);
    setServerAvailable(false);
    setSaveState("sample");
    setSelectedNodeId(next.root.id);
    setOperationLog([]);
    setRunResult(null);
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
        <div className="product-title">
          <div className="eyebrow">Structured Workflow Editor</div>
          <h1>{uiDocument.workflowId}</h1>
        </div>
        <div className="execution-summary">
          <div className="summary-item">
            <span>Connection</span>
            <strong>{serverAvailable ? "Connected" : "Offline"}</strong>
          </div>
          <div className="summary-item">
            <span>Save</span>
            <strong>{saveLabel(saveState)}</strong>
          </div>
          <div className="summary-item result-summary">
            <span>Last run</span>
            <strong>{runResultSummary(runResult)}</strong>
          </div>
        </div>
        <div className="topbar-actions">
          <button className="icon-button run-button" onClick={handleRunWorkflow} disabled={!serverAvailable || runPending}>
            <Play size={16} />
            {runPending ? "Running" : "Run"}
          </button>
          <button
            className="icon-button"
            onClick={() => {
              const next = sampleDocument as UIDocument;
              setUIDocument(next);
              setASTDocument(null);
              setDiagnostics([]);
              setServerAvailable(false);
              setSaveState("sample");
              setSelectedNodeId(next.root.id);
              setOperationLog([]);
              setRunResult(null);
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
        <div className={saveState === "failed" ? "status-pill warn" : "status-pill"}>{saveLabel(saveState)}</div>
        <div className="status-pill">{operationLog.length} saved edits</div>
        <div className="status-pill">{selectedNode.kind}</div>
        {diagnostics.length > 0 ? <div className="status-pill warn">{diagnostics.length} diagnostics</div> : null}
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
            Workbench
          </div>
          <div className="workbench-tabs">
            {(["properties", "run", "diagnostics"] as WorkbenchTab[]).map((tab) => (
              <button
                key={tab}
                className={tab === activeWorkbenchTab ? "workbench-tab active" : "workbench-tab"}
                onClick={() => setActiveWorkbenchTab(tab)}
              >
                {tab}
                {tab === "diagnostics" && diagnostics.length > 0 ? <span>{diagnostics.length}</span> : null}
              </button>
            ))}
          </div>
          <InspectorPane
            node={selectedNode}
            onToggleCollapsed={handleToggleCollapsed}
            onApplyExpression={handleApplyExpression}
            onSelect={setSelectedNodeId}
            diagnostics={diagnostics}
            astDocument={astDocument}
            runResult={runResult}
            activeTab={activeWorkbenchTab}
            saveState={saveState}
            onRun={handleRunWorkflow}
            runPending={runPending}
            serverAvailable={serverAvailable}
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
  onToggleCollapsed,
  onApplyExpression,
  onSelect,
  diagnostics,
  astDocument,
  runResult,
  activeTab,
  saveState,
  onRun,
  runPending,
  serverAvailable,
}: {
  node: UINode;
  onToggleCollapsed: () => void;
  onApplyExpression: (field: InspectorField, value: unknown) => void;
  onSelect: (id: string) => void;
  diagnostics: Diagnostic[];
  astDocument: unknown;
  runResult: RunResult | null;
  activeTab: WorkbenchTab;
  saveState: SaveState;
  onRun: () => void;
  runPending: boolean;
  serverAvailable: boolean;
}) {
  const fields = node.inspector ?? [];
  if (activeTab === "run") {
    return (
      <div className="inspector">
        <div className="inspector-block run-control">
          <div>
            <div className="inspector-title">Execution</div>
            <strong>{runResultSummary(runResult)}</strong>
          </div>
          <button className="ghost-button run-button" onClick={onRun} disabled={!serverAvailable || runPending}>
            <Play size={16} />
            {runPending ? "Running" : "Run current workflow"}
          </button>
        </div>
        {runResult ? <RunResultPanel result={runResult} /> : <div className="empty-state">Run the current saved AST to see returns, state, node outputs, and events.</div>}
      </div>
    );
  }

  if (activeTab === "diagnostics") {
    return (
      <div className="inspector">
        <DiagnosticsPanel diagnostics={diagnostics} />
      </div>
    );
  }

  return (
    <div className="inspector">
      <div className={saveState === "failed" ? "save-banner failed" : "save-banner"}>
        <span>AST file</span>
        <strong>{saveLabel(saveState)}</strong>
      </div>
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
          <button className="ghost-button" onClick={() => onSelect(node.id)}>
            <FileJson size={16} />
            Focus node
          </button>
        </div>
      </div>

      <div className="inspector-block">
        <div className="inspector-title">Properties</div>
        <div className="field-list">
          {fields.map((field) => (
            <InspectorFieldRow key={field.path} field={field} onApplyExpression={onApplyExpression} />
          ))}
        </div>
      </div>

      {astDocument ? null : <div className="empty-state">No AST document loaded from the workflow service.</div>}
    </div>
  );
}

function DiagnosticsPanel({ diagnostics }: { diagnostics: Diagnostic[] }) {
  if (diagnostics.length === 0) {
    return <div className="empty-state">No diagnostics reported.</div>;
  }
  return (
    <div className="inspector-block">
      <div className="inspector-title">Diagnostics</div>
      <div className="diagnostic-list">
        {diagnostics.map((diag, index) => (
          <div className="diagnostic-row" key={`${diag.code ?? "diagnostic"}-${index}`}>
            <strong>{diag.code ?? diag.severity ?? "diagnostic"}</strong>
            <span>{diag.message ?? "No message"}</span>
            {diag.path ? <small>{diag.path}</small> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function RunResultPanel({ result }: { result: RunResult }) {
  const events = result.events ?? [];
  return (
    <div className="inspector-block run-result">
      <div className="inspector-title">Run result</div>
      <div className="result-grid">
        <div>
          <span>Inputs</span>
          <pre>{JSON.stringify(result.inputs ?? {}, null, 2)}</pre>
        </div>
        <div>
          <span>Returns</span>
          <pre>{JSON.stringify(result.returns ?? {}, null, 2)}</pre>
        </div>
        <div>
          <span>State</span>
          <pre>{JSON.stringify(result.state ?? result.variables ?? {}, null, 2)}</pre>
        </div>
        <div>
          <span>Node outputs</span>
          <pre>{JSON.stringify(result.nodeOutputs ?? {}, null, 2)}</pre>
        </div>
      </div>
      <details className="event-details">
        <summary>{events.length} events</summary>
        <pre>{JSON.stringify(events, null, 2)}</pre>
      </details>
    </div>
  );
}

function InspectorFieldRow({
  field,
  onApplyExpression,
}: {
  field: InspectorField;
  onApplyExpression: (field: InspectorField, value: unknown) => void;
}) {
  const editable = field.control === "expression" && !field.readonly;
  const quickKind = quickInputKind(field);
  return (
    <div className="field-row">
      <div className="field-label">{field.label ?? field.path}</div>
      {editable && quickKind ? (
        <QuickExpressionEditor
          field={field}
          kind={quickKind}
          value={field.value}
          onApply={(value) => onApplyExpression(field, value)}
        />
      ) : editable ? (
        <ExpressionEditor value={field.value} onApply={(value) => onApplyExpression(field, value)} />
      ) : (
        <div className="field-value">{renderFieldValue(field.value)}</div>
      )}
    </div>
  );
}

function QuickExpressionEditor({
  field,
  kind,
  value,
  onApply,
}: {
  field: InspectorField;
  kind: "number" | "operator";
  value: unknown;
  onApply: (value: unknown) => void;
}) {
  const initial = normalizeExpression(value);
  const [numberDraft, setNumberDraft] = useState(literalNumberDraft(initial));
  const [operatorDraft, setOperatorDraft] = useState(literalOperatorDraft(initial));

  useEffect(() => {
    const next = normalizeExpression(value);
    setNumberDraft(literalNumberDraft(next));
    setOperatorDraft(literalOperatorDraft(next));
  }, [value]);

  const dirty = isQuickDraftDirty(initial, kind, kind === "number" ? numberDraft : operatorDraft);
  const invalid =
    kind === "number"
      ? numberDraft.trim() === "" || !Number.isFinite(Number(numberDraft))
      : operatorDraft.trim() === "";
  const statusLabel = quickDraftStatus(initial, dirty);

  const revertQuickValue = () => {
    setNumberDraft(literalNumberDraft(initial));
    setOperatorDraft(literalOperatorDraft(initial));
  };

  const saveQuickValue = () => {
    if (kind === "number") {
      const numeric = Number(numberDraft);
      if (!Number.isFinite(numeric)) {
        return;
      }
      onApply({ kind: "literal", value: numeric });
      return;
    }
    if (operatorDraft.trim() === "") {
      return;
    }
    onApply({ kind: "literal", value: operatorDraft });
  };

  return (
    <div className="quick-editor">
      <div className="quick-editor-main">
        {kind === "number" ? (
          <input
            type="number"
            inputMode="decimal"
            placeholder={expressionHint(initial)}
            value={numberDraft}
            onChange={(event) => setNumberDraft(event.target.value)}
          />
        ) : (
          <select value={operatorDraft} onChange={(event) => setOperatorDraft(event.target.value)}>
            <option value="" disabled>
              Select
            </option>
            <option value="+">+</option>
            <option value="-">-</option>
            <option value="*">*</option>
            <option value="/">/</option>
          </select>
        )}
        <button className="ghost-button" onClick={saveQuickValue} disabled={!dirty || invalid}>
          Save
        </button>
      </div>
      <div className={dirty ? "quick-editor-status dirty" : "quick-editor-status"}>
        <span>{statusLabel}</span>
        {dirty ? (
          <button className="text-button" onClick={revertQuickValue}>
            Revert
          </button>
        ) : null}
      </div>
      {dirty ? null : (
        <details className="advanced-expression">
          <summary>Use expression mode</summary>
          <ExpressionEditor value={field.value} onApply={onApply} />
        </details>
      )}
    </div>
  );
}

function ExpressionEditor({ value, onApply }: { value: unknown; onApply: (value: unknown) => void }) {
  const initial = normalizeExpression(value);
  const [kind, setKind] = useState(initial.kind);
  const [literalType, setLiteralType] = useState(literalInputType(initial));
  const [literalValue, setLiteralValue] = useState(formatLiteralInput(initial.value));
  const [refValue, setRefValue] = useState(initial.ref ?? "");
  const [jsonDraft, setJsonDraft] = useState(JSON.stringify(initial, null, 2));
  const [error, setError] = useState("");

  useEffect(() => {
    const next = normalizeExpression(value);
    setKind(next.kind);
    setLiteralType(literalInputType(next));
    setLiteralValue(formatLiteralInput(next.value));
    setRefValue(next.ref ?? "");
    setJsonDraft(JSON.stringify(next, null, 2));
    setError("");
  }, [value]);

  const apply = () => {
    try {
      const expression = buildExpression(kind, literalType, literalValue, refValue, jsonDraft);
      setError("");
      onApply(expression);
    } catch (nextError) {
      setError(formatError(nextError));
    }
  };

  return (
    <div className="expression-editor">
      <div className="expression-toolbar">
        <select value={kind} onChange={(event) => setKind(event.target.value)}>
          <option value="literal">literal</option>
          <option value="ref">ref</option>
          <option value="json">json</option>
        </select>
        {kind === "literal" ? (
          <select value={literalType} onChange={(event) => setLiteralType(event.target.value as LiteralInputType)}>
            <option value="string">string</option>
            <option value="number">number</option>
            <option value="boolean">boolean</option>
          </select>
        ) : null}
      </div>
      {kind === "literal" ? (
        literalType === "boolean" ? (
          <label className="check-row">
            <input
              type="checkbox"
              checked={literalValue === "true"}
              onChange={(event) => setLiteralValue(event.target.checked ? "true" : "false")}
            />
            true
          </label>
        ) : (
          <input
            type={literalType === "number" ? "number" : "text"}
            value={literalValue}
            onChange={(event) => setLiteralValue(event.target.value)}
          />
        )
      ) : null}
      {kind === "ref" ? <input value={refValue} onChange={(event) => setRefValue(event.target.value)} /> : null}
      {kind === "json" ? (
        <textarea value={jsonDraft} onChange={(event) => setJsonDraft(event.target.value)} rows={7} />
      ) : null}
      {error ? <div className="edit-error">{error}</div> : null}
      <button className="ghost-button" onClick={apply}>
        <SquarePen size={16} />
        Apply
      </button>
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

function quickInputKind(field: InspectorField): "number" | "operator" | null {
  if (field.path.endsWith(".inputs.left") || field.path.endsWith(".inputs.right")) {
    return "number";
  }
  if (field.path.endsWith(".inputs.operator")) {
    return "operator";
  }
  return null;
}

function normalizeExpression(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const expression = value as Record<string, unknown>;
    if (typeof expression.kind === "string") {
      return expression;
    }
  }
  return { kind: "literal", value: "" };
}

function literalNumberDraft(expression: Record<string, unknown>) {
  return expression.kind === "literal" && typeof expression.value === "number" ? String(expression.value) : "";
}

function literalOperatorDraft(expression: Record<string, unknown>) {
  if (expression.kind === "literal" && typeof expression.value === "string" && ["+", "-", "*", "/"].includes(expression.value)) {
    return expression.value;
  }
  return "";
}

function isQuickDraftDirty(expression: Record<string, unknown>, kind: "number" | "operator", draft: string) {
  if (expression.kind !== "literal") {
    return draft.trim() !== "";
  }
  if (kind === "number") {
    return typeof expression.value !== "number" || Number(draft) !== expression.value;
  }
  return draft !== expression.value;
}

function quickDraftStatus(expression: Record<string, unknown>, dirty: boolean) {
  if (dirty) {
    return "Unsaved changes";
  }
  if (expression.kind === "literal") {
    return "Saved";
  }
  if (expression.kind === "ref") {
    return "Using expression";
  }
  return "Saved expression";
}

function expressionHint(expression: Record<string, unknown>) {
  if (expression.kind === "ref" && typeof expression.ref === "string") {
    return expression.ref;
  }
  return "value";
}

function literalInputType(expression: Record<string, unknown>): LiteralInputType {
  switch (typeof expression.value) {
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    default:
      return "string";
  }
}

function formatLiteralInput(value: unknown) {
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (typeof value === "number" || typeof value === "string") {
    return String(value);
  }
  return "";
}

function buildExpression(
  kind: string,
  literalType: LiteralInputType,
  literalValue: string,
  refValue: string,
  jsonDraft: string,
) {
  if (kind === "literal") {
    if (literalType === "number") {
      const numeric = Number(literalValue);
      if (!Number.isFinite(numeric)) {
        throw new Error("Number literal is invalid");
      }
      return { kind: "literal", value: numeric };
    }
    if (literalType === "boolean") {
      return { kind: "literal", value: literalValue === "true" };
    }
    return { kind: "literal", value: literalValue };
  }
  if (kind === "ref") {
    if (!refValue.trim()) {
      throw new Error("Reference cannot be empty");
    }
    return { kind: "ref", ref: refValue.trim() };
  }
  const parsed = JSON.parse(jsonDraft) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Expression JSON must be an object");
  }
  const expression = parsed as Record<string, unknown>;
  if (typeof expression.kind !== "string" || expression.kind.length === 0) {
    throw new Error("Expression JSON requires a string kind");
  }
  return expression;
}

function firstDiagnosticMessage(diags: Diagnostic[] | undefined) {
  const first = diags?.[0];
  if (!first) {
    return "";
  }
  return first.message ? `${first.code ?? "diagnostic"}: ${first.message}` : first.code ?? "diagnostic";
}

function formatError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function saveLabel(state: SaveState) {
  switch (state) {
    case "saved":
      return "Saved";
    case "saving":
      return "Saving";
    case "failed":
      return "Save failed";
    case "sample":
      return "Sample";
  }
}

function runResultSummary(result: RunResult | null) {
  if (!result) {
    return "Not run";
  }
  const returns = result.returns ?? {};
  if ("result" in returns) {
    return `result = ${String(returns.result)}`;
  }
  const firstKey = Object.keys(returns)[0];
  if (firstKey) {
    return `${firstKey} = ${String(returns[firstKey])}`;
  }
  return "Completed";
}

class APIError extends Error {
  diagnostics: Diagnostic[];
  network: boolean;

  constructor(message: string, options?: { diagnostics?: Diagnostic[]; network?: boolean }) {
    super(message);
    this.name = "APIError";
    this.diagnostics = options?.diagnostics ?? [];
    this.network = options?.network ?? false;
  }
}

async function requestJSON<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    throw new APIError(`Workflow service unavailable (${formatError(error)})`, { network: true });
  }

  const raw = await response.text();
  let parsed: unknown = {};
  if (raw.trim()) {
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      throw new APIError(`Workflow service returned non-JSON response: ${raw.slice(0, 120)}`);
    }
  }

  const diagnostics = diagnosticsFromPayload(parsed);
  if (!response.ok) {
    throw new APIError(firstDiagnosticMessage(diagnostics) || `Request failed with status ${response.status}`, {
      diagnostics,
    });
  }
  return parsed as T;
}

function diagnosticsFromPayload(payload: unknown): Diagnostic[] {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return [];
  }
  const diagnostics = (payload as { diagnostics?: unknown }).diagnostics;
  return Array.isArray(diagnostics) ? (diagnostics as Diagnostic[]) : [];
}

function normalizeAPIError(error: unknown) {
  if (error instanceof APIError) {
    return error;
  }
  return new APIError(formatError(error));
}

export default App;
