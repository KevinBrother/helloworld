import { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Download,
  FileJson,
  FileUp,
  GitBranch,
  Layers3,
  ListTree,
  Play,
  RefreshCw,
  RotateCcw,
  Search,
  TerminalSquare,
} from "lucide-react";
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
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

type EditorMode = "connected" | "sample" | "loaded";
type SaveState = "sample" | "saved" | "saving" | "failed";
type NavigatorTab = "workflow" | "blocks" | "issues";
type WorkspaceView = "canvas" | "outline" | "contract";
type InspectorTab = "node" | "run" | "diagnostics";
type TraceTab = "operations" | "events" | "raw";
type MobileSurface = "navigator" | "workspace" | "inspector" | "trace";
type ExpressionKind = "literal" | "ref" | "json";
type LiteralInputType = "string" | "number" | "boolean";
type ActionAvailability = {
  run: { enabled: boolean; disabledReason?: string };
  exportOperations: { enabled: boolean; disabledReason?: string };
};

type FlatNode = {
  node: UINode;
  depth: number;
  branch?: string;
};

type BindingToken = {
  group: string;
  ref: string;
  label: string;
  type?: string;
  detail?: string;
};

type OperationTraceEntry = {
  operation: EditOperation;
  recordedAt: string;
  traceStatus: "local" | "saved" | "failed";
  message: string;
};

type WorkflowNodeData = {
  uiNode: UINode;
  branch?: string;
} & Record<string, unknown>;

type WorkflowFlowNode = Node<WorkflowNodeData, "workflow">;
type WorkflowFlowEdge = Edge<Record<string, unknown>, "workflow">;

const DEFAULT_ACTOR = {
  id: "local-user",
  name: "Local Editor",
  kind: "human",
};

const nodeTypes = {
  workflow: memo(WorkflowFlowNode),
};

const GAP_Y = 128;
const GAP_X = 332;

function App() {
  const [uiDocument, setUIDocument] = useState<UIDocument>(() => sampleDocument as UIDocument);
  const [astDocument, setASTDocument] = useState<unknown>(null);
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
  const [serverAvailable, setServerAvailable] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>("sample");
  const [selectedNodeId, setSelectedNodeId] = useState(() => (sampleDocument as UIDocument).root.id);
  const [operationLog, setOperationLog] = useState<OperationTraceEntry[]>([]);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [runPending, setRunPending] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("sample");
  const [status, setStatus] = useState("Sample projection loaded");
  const [serviceError, setServiceError] = useState("Checking workflow service");
  const [serviceRetrying, setServiceRetrying] = useState(true);
  const [navigatorTab, setNavigatorTab] = useState<NavigatorTab>("workflow");
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>("canvas");
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("node");
  const [traceTab, setTraceTab] = useState<TraceTab>("operations");
  const [mobileSurface, setMobileSurface] = useState<MobileSurface>("workspace");
  const [traceOpen, setTraceOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [kindFilter, setKindFilter] = useState("all");
  const [blockQuery, setBlockQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const outline = useMemo(() => flattenNodes(uiDocument.root), [uiDocument]);
  const selectedNode = useMemo(
    () => findNode(uiDocument.root, selectedNodeId) ?? uiDocument.root,
    [uiDocument, selectedNodeId],
  );
  const workflowStats = useMemo(() => summarizeWorkflow(outline), [outline]);
  const blockCatalog = useMemo(() => summarizeBlocks(outline), [outline]);
  const filteredOutline = useMemo(() => filterFlatNodes(outline, searchQuery, kindFilter), [outline, searchQuery, kindFilter]);
  const filteredBlockCatalog = useMemo(() => filterBlockCatalog(blockCatalog, blockQuery), [blockCatalog, blockQuery]);

  const emitOperation = (
    operation: EditOperation,
    message?: string,
    traceStatus: OperationTraceEntry["traceStatus"] = serverAvailable ? "saved" : "local",
  ) => {
    const entry: OperationTraceEntry = {
      operation,
      recordedAt: new Date().toISOString(),
      traceStatus,
      message: message ?? `${operation.type} recorded for ${operation.targetNodeId ?? "workflow"}`,
    };
    setOperationLog((current) => [entry, ...current].slice(0, 80));
    setStatus(message ?? `${operation.type} recorded for ${operation.targetNodeId ?? "workflow"}`);
  };

  const applyServerState = (state: EditorStateResponse) => {
    setASTDocument(state.ast);
    setUIDocument(state.ui);
    setDiagnostics(state.diagnostics ?? []);
    setSelectedNodeId((current) => (findNode(state.ui.root, current) ? current : state.ui.root.id));
  };

  const loadWorkflowService = async (options?: { cancelled?: () => boolean; retry?: boolean }) => {
    if (options?.retry) {
      setServiceRetrying(true);
      setStatus("Checking workflow service");
    }
    try {
      const state = await requestJSON<EditorStateResponse>("/api/workflow");
      if (options?.cancelled?.()) {
        return;
      }
      applyServerState(state);
      setServerAvailable(true);
      setEditorMode("connected");
      setSaveState("saved");
      setServiceError("");
      setStatus("Workflow service connected");
    } catch (error) {
      if (options?.cancelled?.()) {
        return;
      }
      const message = formatError(error);
      setServerAvailable(false);
      setEditorMode((current) => (current === "loaded" ? "loaded" : "sample"));
      setServiceError(message);
      setStatus(`Sample projection active: ${message}`);
    } finally {
      if (!options?.cancelled?.()) {
        setServiceRetrying(false);
      }
    }
  };

  useEffect(() => {
    let cancelled = false;
    void loadWorkflowService({ cancelled: () => cancelled });
    return () => {
      cancelled = true;
    };
  }, []);

  const submitOperation = async (operation: EditOperation) => {
    if (!serverAvailable) {
      emitOperation(operation, "Workflow service unavailable; operation recorded locally", "local");
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
      setEditorMode("connected");
      emitOperation(state.operation ?? operation, "Operation saved to AST", "saved");
      return true;
    } catch (error) {
      const apiError = normalizeAPIError(error);
      setSaveState("failed");
      setDiagnostics(apiError.diagnostics);
      if (apiError.network) {
        setServerAvailable(false);
        setServiceError(apiError.message);
      }
      setStatus(apiError.message);
      emitOperation(operation, apiError.message, "failed");
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
      setStatus("Workflow service unavailable; run requires Connected AST mode");
      setInspectorTab("run");
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
      setInspectorTab("run");
      setTraceTab("events");
      setTraceOpen(true);
      setStatus("Run completed");
    } catch (error) {
      const apiError = normalizeAPIError(error);
      setRunResult(null);
      setDiagnostics(apiError.diagnostics);
      setInspectorTab(apiError.diagnostics.length > 0 ? "diagnostics" : "run");
      if (apiError.network) {
        setServerAvailable(false);
        setServiceError(apiError.message);
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
    setEditorMode("loaded");
    setServiceError("");
    setSaveState("sample");
    setSelectedNodeId(next.root.id);
    setOperationLog([]);
    setRunResult(null);
    setStatus(`Loaded UI JSON: ${file.name}`);
  };

  const handleRetryWorkflowService = () => {
    void loadWorkflowService({ retry: true });
  };

  const handleDownloadOperations = () => {
    const payload = JSON.stringify(operationLog, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = globalThis.document.createElement("a");
    anchor.href = url;
    anchor.download = "edit-operations.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const resetSample = () => {
    const next = sampleDocument as UIDocument;
    setUIDocument(next);
    setASTDocument(null);
    setDiagnostics([]);
    setServerAvailable(false);
    setEditorMode("sample");
    setServiceError("");
    setSaveState("sample");
    setSelectedNodeId(next.root.id);
    setOperationLog([]);
    setRunResult(null);
    setStatus("Sample projection loaded");
  };

  const mode = modeDetails(editorMode, serverAvailable);
  const actionAvailability = getActionAvailability(editorMode, serverAvailable, runPending, operationLog.length);

  return (
    <div className="workbench-shell" data-mode={editorMode}>
      <GlobalHeader
        workflowId={uiDocument.workflowId}
        mode={mode}
        saveState={saveState}
        diagnostics={diagnostics}
        runResult={runResult}
        runPending={runPending}
        serverAvailable={serverAvailable}
        availability={actionAvailability}
        operationCount={operationLog.length}
        onRun={handleRunWorkflow}
        onReset={resetSample}
        onRetry={handleRetryWorkflowService}
        onLoadJSON={() => fileInputRef.current?.click()}
        onDownloadOperations={handleDownloadOperations}
      />

      <input
        ref={fileInputRef}
        className="visually-hidden-file"
        type="file"
        accept="application/json"
        aria-label="Load workflow JSON"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void handleFileLoad(file);
          }
        }}
      />

      <MobileSurfaceSwitch value={mobileSurface} onChange={setMobileSurface} />

      <StatusStrip
        status={status}
        mode={mode}
        serviceError={serviceError}
        serviceRetrying={serviceRetrying}
        serverAvailable={serverAvailable}
        availability={actionAvailability}
        onRetry={handleRetryWorkflowService}
      />

      <main className="workbench-grid">
        <section className={mobileSurface === "navigator" ? "navigator-region mobile-active" : "navigator-region"}>
          <WorkflowNavigator
            activeTab={navigatorTab}
            onTabChange={setNavigatorTab}
            nodes={filteredOutline}
            allNodes={outline}
            selectedId={selectedNodeId}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            kindFilter={kindFilter}
            onKindFilterChange={setKindFilter}
            blockQuery={blockQuery}
            onBlockQueryChange={setBlockQuery}
            onSelect={(id) => {
              setSelectedNodeId(id);
              setMobileSurface("inspector");
            }}
            diagnostics={diagnostics}
            blockCatalog={filteredBlockCatalog}
          />
        </section>

        <section className={mobileSurface === "workspace" ? "workspace-region mobile-active" : "workspace-region"}>
          <WorkspaceSurface
            view={workspaceView}
            onViewChange={setWorkspaceView}
            document={uiDocument}
            outline={outline}
            selectedNode={selectedNode}
            selectedId={selectedNodeId}
            stats={workflowStats}
            diagnostics={diagnostics}
            onSelect={(id) => {
              setSelectedNodeId(id);
              setMobileSurface("inspector");
            }}
          />
        </section>

        <section className={mobileSurface === "inspector" ? "inspector-region mobile-active" : "inspector-region"}>
          <NodeInspector
            activeTab={inspectorTab}
            onTabChange={setInspectorTab}
            node={selectedNode}
            diagnostics={diagnostics}
            runResult={runResult}
            runPending={runPending}
            serverAvailable={serverAvailable}
            saveState={saveState}
            mode={mode}
            astDocument={astDocument}
            onRun={handleRunWorkflow}
            onToggleCollapsed={handleToggleCollapsed}
            onApplyExpression={handleApplyExpression}
          />
        </section>
      </main>

      <section className={mobileSurface === "trace" ? "trace-region mobile-active" : "trace-region"}>
        <TraceDock
          open={traceOpen}
          onOpenChange={setTraceOpen}
          activeTab={traceTab}
          onTabChange={setTraceTab}
          operations={operationLog}
          runResult={runResult}
          selectedNode={selectedNode}
          astDocument={astDocument}
          uiDocument={uiDocument}
        />
      </section>
    </div>
  );
}

function GlobalHeader({
  workflowId,
  mode,
  saveState,
  diagnostics,
  runResult,
  runPending,
  serverAvailable,
  availability,
  operationCount,
  onRun,
  onReset,
  onRetry,
  onLoadJSON,
  onDownloadOperations,
}: {
  workflowId: string;
  mode: ReturnType<typeof modeDetails>;
  saveState: SaveState;
  diagnostics: Diagnostic[];
  runResult: RunResult | null;
  runPending: boolean;
  serverAvailable: boolean;
  availability: ActionAvailability;
  operationCount: number;
  onRun: () => void;
  onReset: () => void;
  onRetry: () => void;
  onLoadJSON: () => void;
  onDownloadOperations: () => void;
}) {
  return (
    <header className="global-header">
      <div className="identity-block">
        <span className="eyebrow">RPA Workflow Workbench</span>
        <h1>{workflowId}</h1>
      </div>

      <div className="header-metrics" aria-label="Workflow status">
        <StatusMetric label="Mode" value={mode.label} tone={mode.tone} />
        <StatusMetric label="Save" value={saveLabel(saveState)} tone={saveState === "failed" ? "danger" : "neutral"} />
        <StatusMetric label="Diagnostics" value={String(diagnostics.length)} tone={diagnostics.length > 0 ? "warn" : "ok"} />
        <StatusMetric label="Last run" value={runResultSummary(runResult)} tone={runResult ? "ok" : "neutral"} />
      </div>

      <div className="header-actions">
        <button
          className="primary-button"
          onClick={onRun}
          disabled={!availability.run.enabled}
          title={availability.run.disabledReason}
        >
          <Play size={16} />
          {runPending ? "Running" : "Run"}
        </button>
        <button className="icon-button" onClick={onRetry}>
          <RefreshCw size={16} />
          Retry service
        </button>
        <button className="icon-button" onClick={onReset}>
          <RotateCcw size={16} />
          Reset sample
        </button>
        <button className="icon-button" onClick={onLoadJSON}>
          <FileUp size={16} />
          Load JSON
        </button>
        <button
          className="icon-button"
          onClick={onDownloadOperations}
          disabled={!availability.exportOperations.enabled}
          title={availability.exportOperations.disabledReason}
        >
          <Download size={16} />
          Export ops
        </button>
      </div>
    </header>
  );
}

function StatusMetric({ label, value, tone }: { label: string; value: string; tone: "ok" | "warn" | "danger" | "neutral" }) {
  return (
    <div className={`status-metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function MobileSurfaceSwitch({
  value,
  onChange,
}: {
  value: MobileSurface;
  onChange: (value: MobileSurface) => void;
}) {
  const surfaces: Array<{ value: MobileSurface; label: string }> = [
    { value: "navigator", label: "Flow" },
    { value: "workspace", label: "Canvas" },
    { value: "inspector", label: "Inspect" },
    { value: "trace", label: "Trace" },
  ];
  return (
    <nav className="mobile-surface-switch" aria-label="Mobile workbench surfaces">
      {surfaces.map((surface) => (
        <button
          key={surface.value}
          className={surface.value === value ? "surface-button active" : "surface-button"}
          onClick={() => onChange(surface.value)}
        >
          {surface.label}
        </button>
      ))}
    </nav>
  );
}

function StatusStrip({
  status,
  mode,
  serviceError,
  serviceRetrying,
  serverAvailable,
  availability,
  onRetry,
}: {
  status: string;
  mode: ReturnType<typeof modeDetails>;
  serviceError: string;
  serviceRetrying: boolean;
  serverAvailable: boolean;
  availability: ActionAvailability;
  onRetry: () => void;
}) {
  return (
    <section className="mode-strip" aria-live="polite">
      <div className={`mode-label ${mode.tone}`}>
        {mode.icon}
        <strong>{mode.label}</strong>
        <span>{mode.description}</span>
      </div>
      <div className="status-message">{status}</div>
      {!serverAvailable && serviceError ? (
        <div className="service-recovery">
          <AlertTriangle size={16} />
          <span>{serviceError}</span>
          <button className="text-action" onClick={onRetry} disabled={serviceRetrying}>
            {serviceRetrying ? "Checking" : "Retry connection"}
          </button>
        </div>
      ) : null}
      <div className="action-availability" aria-label="Action availability">
        <span>{availability.run.enabled ? "Run ready" : availability.run.disabledReason}</span>
        <span>{availability.exportOperations.enabled ? "Operations export ready" : availability.exportOperations.disabledReason}</span>
      </div>
    </section>
  );
}

function WorkflowNavigator({
  activeTab,
  onTabChange,
  nodes,
  allNodes,
  selectedId,
  searchQuery,
  onSearchChange,
  kindFilter,
  onKindFilterChange,
  blockQuery,
  onBlockQueryChange,
  onSelect,
  diagnostics,
  blockCatalog,
}: {
  activeTab: NavigatorTab;
  onTabChange: (tab: NavigatorTab) => void;
  nodes: FlatNode[];
  allNodes: FlatNode[];
  selectedId: string;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  kindFilter: string;
  onKindFilterChange: (value: string) => void;
  blockQuery: string;
  onBlockQueryChange: (value: string) => void;
  onSelect: (id: string) => void;
  diagnostics: Diagnostic[];
  blockCatalog: Array<{ key: string; count: number; nodes: UINode[] }>;
}) {
  const kinds = useMemo(() => ["all", ...new Set(allNodes.map(({ node }) => node.kind))], [allNodes]);
  const workflowCapacity = `${allNodes.length} nodes / ${blockCatalog.length} block types`;
  return (
    <aside className="workbench-panel navigator-panel">
      <PanelHeader icon={<ListTree size={16} />} title="Navigator" detail={`${allNodes.length} nodes`} />
      <SegmentedTabs
        tabs={[
          { value: "workflow", label: "Workflow" },
          { value: "blocks", label: "Blocks" },
          { value: "issues", label: `Issues ${diagnostics.length}` },
        ]}
        value={activeTab}
        onChange={(value) => onTabChange(value as NavigatorTab)}
      />

      {activeTab === "workflow" ? (
        <>
          <div className="capacity-strip">
            <strong>Scale ready</strong>
            <span>{workflowCapacity}</span>
          </div>
          <label className="search-box">
            <Search size={15} />
            <input
              value={searchQuery}
              placeholder="Search id, label, kind, path"
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </label>
          <NodeKindFilter kinds={kinds} value={kindFilter} onChange={onKindFilterChange} />
          <div className="workflow-tree">
            {nodes.map(({ node, depth, branch }) => (
              <button
                key={`${branch ?? "root"}-${node.id}`}
                className={node.id === selectedId ? "tree-row selected" : "tree-row"}
                style={{ "--depth": depth } as React.CSSProperties}
                onClick={() => onSelect(node.id)}
              >
                <span className="tree-kind">{node.kind}</span>
                <span className="tree-label">{node.label ?? node.id}</span>
                {branch ? <span className="tree-branch">{branch}</span> : null}
                {node.validationSummary?.errors ? <span className="issue-dot error">{node.validationSummary.errors}</span> : null}
                {node.validationSummary?.warnings ? <span className="issue-dot warn">{node.validationSummary.warnings}</span> : null}
              </button>
            ))}
          </div>
        </>
      ) : null}

      {activeTab === "blocks" ? (
        <>
          <BlockCatalogSearch value={blockQuery} onChange={onBlockQueryChange} />
          <div className="block-catalog">
            {blockCatalog.length === 0 ? <EmptyState>No block nodes match the current filter.</EmptyState> : null}
            {blockCatalog.map((block) => (
              <section className="catalog-row" key={block.key}>
                <div>
                  <strong>{block.key}</strong>
                  <span>{block.count} node instances</span>
                </div>
                <code>{block.nodes.map((node) => node.id).join(", ")}</code>
              </section>
            ))}
          </div>
        </>
      ) : null}

      {activeTab === "issues" ? <DiagnosticsList diagnostics={diagnostics} /> : null}
    </aside>
  );
}

function NodeKindFilter({ kinds, value, onChange }: { kinds: string[]; value: string; onChange: (value: string) => void }) {
  return (
    <label className="filter-row">
      <span>Kind</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {kinds.map((kind) => (
          <option key={kind} value={kind}>
            {kind === "all" ? "All node kinds" : kind}
          </option>
        ))}
      </select>
    </label>
  );
}

function BlockCatalogSearch({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="search-box block-search">
      <Search size={15} />
      <input value={value} placeholder="Search block id or node instance" onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function WorkspaceSurface({
  view,
  onViewChange,
  document,
  outline,
  selectedNode,
  selectedId,
  stats,
  diagnostics,
  onSelect,
}: {
  view: WorkspaceView;
  onViewChange: (view: WorkspaceView) => void;
  document: UIDocument;
  outline: FlatNode[];
  selectedNode: UINode;
  selectedId: string;
  stats: ReturnType<typeof summarizeWorkflow>;
  diagnostics: Diagnostic[];
  onSelect: (id: string) => void;
}) {
  return (
    <section className="workbench-panel workspace-panel">
      <div className="workspace-toolbar">
        <PanelHeader icon={<Layers3 size={16} />} title="Workspace" detail={selectedNode.path ?? selectedNode.id} />
        <SegmentedTabs
          tabs={[
            { value: "canvas", label: "Canvas" },
            { value: "outline", label: "Outline" },
            { value: "contract", label: "Contract" },
          ]}
          value={view}
          onChange={(value) => onViewChange(value as WorkspaceView)}
        />
      </div>
      <div className="workspace-summary">
        <SummaryTile label="Nodes" value={String(stats.nodes)} />
        <SummaryTile label="Blocks" value={String(stats.blocks)} />
        <SummaryTile label="Branches" value={String(stats.branches)} />
        <SummaryTile label="Issues" value={String(diagnostics.length)} />
      </div>
      <div className="workspace-body">
        {view === "canvas" ? <WorkflowCanvas root={document.root} selectedId={selectedId} onSelect={onSelect} /> : null}
        {view === "outline" ? <OutlineTable nodes={outline} selectedId={selectedId} onSelect={onSelect} /> : null}
        {view === "contract" ? <ContractOverview document={document} selectedNode={selectedNode} /> : null}
      </div>
    </section>
  );
}

function WorkflowCanvas({ root, selectedId, onSelect }: { root: UINode; selectedId: string; onSelect: (id: string) => void }) {
  const graph = useMemo(() => buildFlowGraph(root), [root]);
  return (
    <div className="flow-pane">
      <ReactFlow
        nodes={graph.nodes}
        edges={graph.edges}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        edgesFocusable
        nodesFocusable
        edgesReconnectable={false}
        elementsSelectable
        deleteKeyCode={null}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.35}
        maxZoom={1.5}
        onNodeClick={(_, flowNode) => onSelect(flowNode.data.uiNode.id)}
      >
        <Background color="var(--canvas-dot)" gap={24} size={1} />
        <Controls showInteractive={false} />
        <MiniMap
          pannable
          zoomable
          nodeColor={(miniNode) => (miniNode.id === selectedId ? "var(--accent)" : "var(--minimap-node)")}
          maskColor="var(--minimap-mask)"
        />
      </ReactFlow>
    </div>
  );
}

function WorkflowFlowNode({ data, selected }: NodeProps<WorkflowFlowNode>) {
  const node = data.uiNode;
  const inputs = (node.inspector ?? []).filter((field) => field.control === "expression").length;
  const outputs = normalizeBindingTokens(node.metadata?.outputs).length;
  const errors = node.validationSummary?.errors ?? 0;
  const warnings = node.validationSummary?.warnings ?? 0;
  return (
    <article className={selected ? "flow-node selected" : "flow-node"}>
      <Handle type="target" position={Position.Top} />
      <div className="flow-node-head">
        <span>{node.kind}</span>
        {data.branch ? <strong>{data.branch}</strong> : null}
      </div>
      <div className="flow-node-title">{node.label ?? node.id}</div>
      <div className="flow-node-meta">
        <span>{inputs} inputs</span>
        <span>{outputs} outputs</span>
        {errors > 0 ? <span className="node-status error">{errors} errors</span> : warnings > 0 ? <span className="node-status warn">{warnings} warnings</span> : <span className="node-status ok">valid</span>}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </article>
  );
}

function NodeInspector({
  activeTab,
  onTabChange,
  node,
  diagnostics,
  runResult,
  runPending,
  serverAvailable,
  saveState,
  mode,
  astDocument,
  onRun,
  onToggleCollapsed,
  onApplyExpression,
}: {
  activeTab: InspectorTab;
  onTabChange: (tab: InspectorTab) => void;
  node: UINode;
  diagnostics: Diagnostic[];
  runResult: RunResult | null;
  runPending: boolean;
  serverAvailable: boolean;
  saveState: SaveState;
  mode: ReturnType<typeof modeDetails>;
  astDocument: unknown;
  onRun: () => void;
  onToggleCollapsed: () => void;
  onApplyExpression: (field: InspectorField, value: unknown) => void;
}) {
  const fields = node.inspector ?? [];
  const inputFields = fields.filter((field) => field.control === "expression");
  const propertyFields = fields.filter((field) => field.control !== "expression");
  const contractRows = contractFieldRows(propertyFields);
  const outputs = normalizeBindingTokens(node.metadata?.outputs);
  const diagnosticsForNode = diagnostics.filter((diagnostic) => diagnostic.path && node.path && diagnostic.path.includes(node.path));

  return (
    <aside className="workbench-panel inspector-panel">
      <PanelHeader icon={<FileJson size={16} />} title="Inspector" detail={node.id} />
      <SegmentedTabs
        tabs={[
          { value: "node", label: "Node" },
          { value: "run", label: "Run" },
          { value: "diagnostics", label: `Diagnostics ${diagnostics.length}` },
        ]}
        value={activeTab}
        onChange={(value) => onTabChange(value as InspectorTab)}
      />

      {activeTab === "node" ? (
        <div className="inspector-stack">
          <section className={`save-state ${saveState === "failed" ? "failed" : ""}`}>
            <span>{mode.label}</span>
            <strong>{saveLabel(saveState)}</strong>
          </section>

          <section className="node-hero">
            <div>
              <span>{node.kind}</span>
              <h2>{node.label ?? node.id}</h2>
            </div>
            <code>{node.path ?? "$"}</code>
          </section>

          <InspectorSection title="Input Bindings" detail={`${inputFields.length} editable`}>
            {inputFields.length === 0 ? <EmptyState>No bindable inputs for this node.</EmptyState> : null}
            {inputFields.map((field) => (
              <InspectorFieldRow key={field.path} field={field} onApplyExpression={onApplyExpression} mode="binding" />
            ))}
          </InspectorSection>

          <InspectorSection title="Exposed Outputs" detail={`${outputs.length} tokens`}>
            {outputs.length === 0 ? <EmptyState>No exposed outputs for downstream bindings.</EmptyState> : null}
            {outputs.map((output) => (
              <div className="output-row" key={output.ref}>
                <div>
                  <strong>{output.label}</strong>
                  <span>{output.type ?? "unknown"}</span>
                </div>
                <code>{output.ref}</code>
              </div>
            ))}
          </InspectorSection>

          <InspectorSection title="Contract" detail="AST projection">
            <KeyValueGrid
              rows={[
                ["Node ID", node.id],
                ["Kind", node.kind],
                ["Editable", node.editable ? "yes" : "no"],
                ["Errors", String(node.validationSummary?.errors ?? diagnosticsForNode.length)],
                ["Warnings", String(node.validationSummary?.warnings ?? 0)],
              ]}
            />
            {contractRows.length > 0 ? (
              <div className="property-list">
                {contractRows.map((row) => (
                  <div className="property-row" key={row.path}>
                    <span>{row.label}</span>
                    <strong>{row.value}</strong>
                    <code>{row.path}</code>
                  </div>
                ))}
              </div>
            ) : null}
          </InspectorSection>

          <InspectorSection title="Capabilities" detail="Allowed operations">
            <CapabilityList node={node} onToggleCollapsed={onToggleCollapsed} />
          </InspectorSection>
        </div>
      ) : null}

      {activeTab === "run" ? (
        <RunPanel
          runResult={runResult}
          runPending={runPending}
          serverAvailable={serverAvailable}
          astDocument={astDocument}
          onRun={onRun}
        />
      ) : null}

      {activeTab === "diagnostics" ? <DiagnosticsList diagnostics={diagnostics} /> : null}
    </aside>
  );
}

function InspectorSection({ title, detail, children }: { title: string; detail: string; children: React.ReactNode }) {
  return (
    <section className="inspector-section">
      <div className="section-heading">
        <h3>{title}</h3>
        <span>{detail}</span>
      </div>
      {children}
    </section>
  );
}

function InspectorFieldRow({
  field,
  onApplyExpression,
  mode = "property",
}: {
  field: InspectorField;
  onApplyExpression: (field: InspectorField, value: unknown) => void;
  mode?: "binding" | "property";
}) {
  const editable = field.control === "expression" && !field.readonly;
  return (
    <div className="field-row">
      <div className="field-label">
        <span>{field.label ?? field.path}</span>
        {mode === "binding" ? <BindingStatusBadge value={field.value} readonly={field.readonly} /> : null}
      </div>
      <FieldContractSummary field={field} />
      {editable ? (
        <BindingExpressionEditor field={field} onApply={(value) => onApplyExpression(field, value)} />
      ) : (
        <code className="field-value">{formatContractValue(field.value)}</code>
      )}
    </div>
  );
}

function BindingStatusBadge({ value, readonly }: { value: unknown; readonly?: boolean }) {
  const expression = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
  const kind = typeof expression?.kind === "string" ? expression.kind : "value";
  const tone = readonly ? "readonly" : kind === "ref" ? "ref" : kind === "literal" ? "literal" : "complex";
  const label = readonly ? "readonly" : kind === "ref" ? "reference" : kind === "literal" ? "literal" : "expression";
  return <span className={`binding-status ${tone}`}>{label}</span>;
}

function FieldContractSummary({ field }: { field: InspectorField }) {
  const tokens = normalizeBindingTokens(field.metadata?.availableTokens);
  return (
    <div className="field-contract-summary">
      <code>{shortPath(field.path)}</code>
      <span>{field.control ?? "value"}</span>
      <span>{field.readonly ? "readonly" : "editable"}</span>
      {tokens.length > 0 ? <span>{tokens.length} legal refs</span> : null}
    </div>
  );
}

function BindingExpressionEditor({ field, onApply }: { field: InspectorField; onApply: (value: unknown) => void }) {
  const [open, setOpen] = useState(false);
  const tokens = normalizeBindingTokens(field.metadata?.availableTokens);
  const grouped = groupBindingTokens(tokens);

  return (
    <div className="binding-editor">
      <button className="binding-input" type="button" onClick={() => setOpen((current) => !current)}>
        <span>{compactExpression(field.value)}</span>
        <ChevronDown size={15} />
      </button>
      {open ? (
        <div className="token-picker" role="dialog" aria-label="Token Picker">
          {tokens.length === 0 ? <EmptyState>No legal references in scope.</EmptyState> : null}
          {grouped.map((group) => (
            <section className="token-group" key={group.name}>
              <div className="token-group-title">{group.name}</div>
              {group.tokens.map((token) => (
                <button
                  className="token-option"
                  type="button"
                  key={token.ref}
                  onClick={() => {
                    onApply({ kind: "ref", ref: token.ref });
                    setOpen(false);
                  }}
                >
                  <span>{token.label}</span>
                  <code>{token.ref}</code>
                  <small>{[token.type, token.detail].filter(Boolean).join(" - ") || "reference"}</small>
                </button>
              ))}
            </section>
          ))}
        </div>
      ) : null}
      <details className="advanced-expression">
        <summary>Edit literal or JSON expression</summary>
        <ExpressionEditor value={field.value} onApply={onApply} />
      </details>
    </div>
  );
}

function ExpressionEditor({ value, onApply }: { value: unknown; onApply: (value: unknown) => void }) {
  const initial = normalizeExpression(value);
  const [kind, setKind] = useState<ExpressionKind>(initial.kind);
  const [literalType, setLiteralType] = useState<LiteralInputType>(literalInputType(initial));
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
        <select value={kind} onChange={(event) => setKind(event.target.value as ExpressionKind)}>
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
      {kind === "literal" && literalType !== "boolean" ? (
        <input
          type={literalType === "number" ? "number" : "text"}
          value={literalValue}
          onChange={(event) => setLiteralValue(event.target.value)}
        />
      ) : null}
      {kind === "literal" && literalType === "boolean" ? (
        <label className="check-row">
          <input
            type="checkbox"
            checked={literalValue === "true"}
            onChange={(event) => setLiteralValue(event.target.checked ? "true" : "false")}
          />
          true
        </label>
      ) : null}
      {kind === "ref" ? <input value={refValue} onChange={(event) => setRefValue(event.target.value)} /> : null}
      {kind === "json" ? <textarea value={jsonDraft} onChange={(event) => setJsonDraft(event.target.value)} /> : null}
      {error ? <div className="edit-error">{error}</div> : null}
      <button className="secondary-button" onClick={apply}>
        Apply expression
      </button>
    </div>
  );
}

function CapabilityList({ node, onToggleCollapsed }: { node: UINode; onToggleCollapsed: () => void }) {
  const capabilities = node.capabilities ?? {};
  const entries = Object.entries(capabilities);
  return (
    <div className="capability-list">
      <button className="secondary-button" onClick={onToggleCollapsed}>
        <GitBranch size={15} />
        Toggle collapsed
      </button>
      {entries.length === 0 ? <EmptyState>No capabilities exposed by this projection.</EmptyState> : null}
      {entries.map(([name, capability]) => (
        <CapabilityStatus key={name} name={name} capability={capability} />
      ))}
    </div>
  );
}

function CapabilityStatus({
  name,
  capability,
}: {
  name: string;
  capability: NonNullable<UINode["capabilities"]>[keyof NonNullable<UINode["capabilities"]>];
}) {
  return (
    <div className={capability.enabled ? "capability-row enabled" : "capability-row disabled"}>
      <span>{capability.label ?? name}</span>
      <strong>{capability.enabled ? "enabled" : capability.reason ?? "disabled because projection disallows this action"}</strong>
    </div>
  );
}

function RunPanel({
  runResult,
  runPending,
  serverAvailable,
  astDocument,
  onRun,
}: {
  runResult: RunResult | null;
  runPending: boolean;
  serverAvailable: boolean;
  astDocument: unknown;
  onRun: () => void;
}) {
  return (
    <div className="inspector-stack">
      <section className="run-callout">
        <div>
          <span>Execution</span>
          <strong>{runResultSummary(runResult)}</strong>
        </div>
        <button className="primary-button" onClick={onRun} disabled={!serverAvailable || runPending}>
          <Play size={16} />
          {runPending ? "Running" : "Run workflow"}
        </button>
      </section>
      {!serverAvailable ? <EmptyState>Run requires Connected AST mode. Start the workflow service and retry.</EmptyState> : null}
      {runResult ? <RunResultPanel result={runResult} /> : <EmptyState>No run result yet.</EmptyState>}
      {!astDocument ? <EmptyState>No AST document loaded from the workflow service.</EmptyState> : null}
    </div>
  );
}

function TraceDock({
  open,
  onOpenChange,
  activeTab,
  onTabChange,
  operations,
  runResult,
  selectedNode,
  astDocument,
  uiDocument,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeTab: TraceTab;
  onTabChange: (tab: TraceTab) => void;
  operations: OperationTraceEntry[];
  runResult: RunResult | null;
  selectedNode: UINode;
  astDocument: unknown;
  uiDocument: UIDocument;
}) {
  const rawState = {
    selectedNode,
    uiDocument: { schemaVersion: uiDocument.schemaVersion, workflowId: uiDocument.workflowId },
    astLoaded: Boolean(astDocument),
  };
  return (
    <aside className={open ? "trace-dock open" : "trace-dock"}>
      <button className="trace-toggle" onClick={() => onOpenChange(!open)} aria-expanded={open}>
        <TerminalSquare size={16} />
        Trace Dock
        <span>{open ? "Collapse" : "Expand"}</span>
      </button>
      {open ? (
        <div className="trace-content">
          <SegmentedTabs
            tabs={[
              { value: "operations", label: `Edit Operations ${operations.length}` },
              { value: "events", label: `Run Events ${(runResult?.events ?? []).length}` },
              { value: "raw", label: "Raw State" },
            ]}
            value={activeTab}
            onChange={(value) => onTabChange(value as TraceTab)}
          />
          {activeTab === "operations" ? <OperationsTrace operations={operations} /> : null}
          {activeTab === "events" ? <EventsTrace runResult={runResult} /> : null}
          {activeTab === "raw" ? <JsonBlock value={rawState} /> : null}
        </div>
      ) : null}
    </aside>
  );
}

function OperationsTrace({ operations }: { operations: OperationTraceEntry[] }) {
  if (operations.length === 0) {
    return <EmptyState>No edit operations recorded.</EmptyState>;
  }
  return (
    <div className="trace-table">
      {operations.map((entry) => (
        <article className={`trace-row ${entry.traceStatus}`} key={entry.operation.operationId}>
          <div>
            <strong>{entry.operation.type}</strong>
            <span>{entry.operation.targetNodeId ?? "workflow"}</span>
          </div>
          <code>{entry.operation.path ?? entry.operation.operationId}</code>
          <div className="trace-result">
            <span>{formatTraceTime(entry.recordedAt)}</span>
            <TraceStatus status={entry.traceStatus} />
            <small>{entry.message || summarizePayload(entry.operation.payload)}</small>
          </div>
        </article>
      ))}
    </div>
  );
}

function TraceStatus({ status }: { status: OperationTraceEntry["traceStatus"] }) {
  return <strong className={`trace-status ${status}`}>{status}</strong>;
}

function EventsTrace({ runResult }: { runResult: RunResult | null }) {
  const events = runResult?.events ?? [];
  if (events.length === 0) {
    return <EmptyState>No run events captured.</EmptyState>;
  }
  return (
    <div className="trace-table">
      {events.map((event, index) => (
        <article className="trace-row" key={`${event.name ?? "event"}-${index}`}>
          <div>
            <strong>{event.name ?? "event"}</strong>
            <span>{event.statementKind ?? "statement"}</span>
          </div>
          <code>{event.statementId ?? event.workflowId ?? "workflow"}</code>
          <small>{summarizePayload(event.payload)}</small>
        </article>
      ))}
    </div>
  );
}

function RunResultPanel({ result }: { result: RunResult }) {
  return (
    <section className="run-result-grid">
      <JsonCard title="Inputs" value={result.inputs ?? {}} />
      <JsonCard title="Returns" value={result.returns ?? {}} />
      <JsonCard title="State" value={result.state ?? result.variables ?? {}} />
      <JsonCard title="Node outputs" value={result.nodeOutputs ?? {}} />
    </section>
  );
}

function DiagnosticsList({ diagnostics }: { diagnostics: Diagnostic[] }) {
  if (diagnostics.length === 0) {
    return <EmptyState>No diagnostics reported.</EmptyState>;
  }
  return (
    <div className="diagnostic-list">
      {diagnostics.map((diagnostic, index) => (
        <article className={`diagnostic-row ${diagnostic.severity ?? "warn"}`} key={`${diagnostic.code ?? "diagnostic"}-${index}`}>
          <strong>{diagnostic.code ?? diagnostic.severity ?? "diagnostic"}</strong>
          <span>{diagnostic.message ?? "No message"}</span>
          {diagnostic.path ? <code>{diagnostic.path}</code> : null}
          {diagnostic.hint ? <small>{diagnostic.hint}</small> : null}
        </article>
      ))}
    </div>
  );
}

function OutlineTable({ nodes, selectedId, onSelect }: { nodes: FlatNode[]; selectedId: string; onSelect: (id: string) => void }) {
  return (
    <div className="outline-table">
      {nodes.map(({ node, depth, branch }) => (
        <button
          key={`${branch ?? "root"}-${node.id}`}
          className={node.id === selectedId ? "outline-row selected" : "outline-row"}
          onClick={() => onSelect(node.id)}
        >
          <span style={{ "--depth": depth } as React.CSSProperties}>{node.label ?? node.id}</span>
          <code>{node.kind}</code>
          <code>{node.path ?? "$"}</code>
          <small>{branch ?? "main"}</small>
        </button>
      ))}
    </div>
  );
}

function ContractOverview({ document, selectedNode }: { document: UIDocument; selectedNode: UINode }) {
  return (
    <div className="contract-overview">
      <JsonCard
        title="Document contract"
        value={{
          schemaVersion: document.schemaVersion,
          workflowId: document.workflowId,
          rootKind: document.root.kind,
          metadata: document.metadata ?? {},
        }}
      />
      <JsonCard title="Selected UI node" value={selectedNode} />
    </div>
  );
}

function PanelHeader({ icon, title, detail }: { icon: React.ReactNode; title: string; detail?: string }) {
  return (
    <div className="panel-heading">
      <div>
        {icon}
        <span>{title}</span>
      </div>
      {detail ? <code>{detail}</code> : null}
    </div>
  );
}

function SegmentedTabs({
  tabs,
  value,
  onChange,
}: {
  tabs: Array<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="segmented-tabs" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          className={tab.value === value ? "tab-button active" : "tab-button"}
          role="tab"
          aria-selected={tab.value === value}
          onClick={() => onChange(tab.value)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="summary-tile">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function KeyValueGrid({ rows }: { rows: Array<[string, string]> }) {
  return (
    <div className="kv-grid">
      {rows.map(([key, value]) => (
        <div key={key}>
          <span>{key}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="empty-state">{children}</div>;
}

function JsonCard({ title, value }: { title: string; value: unknown }) {
  return (
    <section className="json-card">
      <h3>{title}</h3>
      <JsonBlock value={value} />
    </section>
  );
}

function JsonBlock({ value }: { value: unknown }) {
  return <pre className="json-block">{JSON.stringify(value, null, 2)}</pre>;
}

function modeDetails(mode: EditorMode, serverAvailable: boolean) {
  if (serverAvailable && mode === "connected") {
    return {
      label: "Connected AST",
      description: "Edits are submitted to the local workflow service and written back to AST.",
      tone: "ok" as const,
      icon: <CheckCircle2 size={16} />,
    };
  }
  if (mode === "loaded") {
    return {
      label: "Loaded UI JSON",
      description: "Inspecting a local UI projection. Run and save require the workflow service.",
      tone: "warn" as const,
      icon: <FileJson size={16} />,
    };
  }
  return {
    label: "Sample Projection",
    description: "Using bundled projection data. Local edits are recorded as operations.",
    tone: "warn" as const,
    icon: <AlertTriangle size={16} />,
  };
}

function modeAllowsRun(mode: EditorMode, serverAvailable: boolean) {
  return mode === "connected" && serverAvailable;
}

function getActionAvailability(
  mode: EditorMode,
  serverAvailable: boolean,
  runPending: boolean,
  operationCount: number,
): ActionAvailability {
  const runEnabled = modeAllowsRun(mode, serverAvailable) && !runPending;
  const runReason = runPending
    ? "Run is already in progress"
    : modeAllowsRun(mode, serverAvailable)
      ? undefined
      : "Run requires Connected AST mode";
  return {
    run: {
      enabled: runEnabled,
      disabledReason: runReason,
    },
    exportOperations: {
      enabled: operationCount > 0,
      disabledReason: operationCount > 0 ? undefined : "Export requires at least one recorded edit operation",
    },
  };
}

function flattenNodes(root: UINode): FlatNode[] {
  const rows: FlatNode[] = [];
  const visit = (node: UINode, depth: number, branch?: string) => {
    rows.push({ node, depth, branch });
    if (!node.collapsed) {
      for (const child of node.children ?? []) {
        visit(child, depth + 1, branch);
      }
      for (const nextBranch of node.branches ?? []) {
        for (const child of nextBranch.children ?? []) {
          visit(child, depth + 1, nextBranch.label ?? nextBranch.kind ?? nextBranch.id);
        }
      }
    }
  };
  visit(root, 0);
  return rows;
}

function filterFlatNodes(nodes: FlatNode[], query: string, kindFilter: string) {
  const normalized = query.trim().toLowerCase();
  return nodes.filter(({ node, branch }) =>
    (kindFilter === "all" || node.kind === kindFilter) &&
    (!normalized ||
      [node.id, node.kind, node.label, node.path, branch].some((value) => String(value ?? "").toLowerCase().includes(normalized))),
  );
}

function filterBlockCatalog(blocks: Array<{ key: string; count: number; nodes: UINode[] }>, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return blocks;
  }
  return blocks.filter((block) =>
    [block.key, ...block.nodes.map((node) => node.id), ...block.nodes.map((node) => node.label ?? "")]
      .join(" ")
      .toLowerCase()
      .includes(normalized),
  );
}

function summarizeWorkflow(nodes: FlatNode[]) {
  return {
    nodes: nodes.length,
    blocks: nodes.filter(({ node }) => node.kind === "callBlock").length,
    branches: nodes.filter(({ node }) => (node.branches ?? []).length > 0).length,
  };
}

function summarizeBlocks(nodes: FlatNode[]) {
  const blocks = new Map<string, UINode[]>();
  for (const { node } of nodes) {
    if (node.kind !== "callBlock") {
      continue;
    }
    const block = fieldValue(node, "Block") ?? node.label ?? node.id;
    blocks.set(block, [...(blocks.get(block) ?? []), node]);
  }
  return [...blocks.entries()]
    .map(([key, blockNodes]) => ({ key, count: blockNodes.length, nodes: blockNodes }))
    .sort((left, right) => left.key.localeCompare(right.key));
}

function buildFlowGraph(root: UINode): { nodes: WorkflowFlowNode[]; edges: WorkflowFlowEdge[] } {
  const nodes: WorkflowFlowNode[] = [];
  const edges: WorkflowFlowEdge[] = [];
  const visit = (node: UINode, depth: number, slot: number, branch?: string) => {
    nodes.push({
      id: node.id,
      type: "workflow",
      position: { x: slot * GAP_X, y: depth * GAP_Y },
      data: { uiNode: node, branch },
    });

    let childSlot = slot;
    for (const child of node.children ?? []) {
      edges.push(makeEdge(node.id, child.id));
      visit(child, depth + 1, childSlot, branch);
    }

    const branches = node.branches ?? [];
    const startSlot = slot - (branches.length - 1) / 2;
    branches.forEach((nextBranch, index) => {
      const branchSlot = startSlot + index;
      for (const child of nextBranch.children ?? []) {
        edges.push(makeEdge(node.id, child.id, nextBranch.label ?? nextBranch.kind));
        visit(child, depth + 1, branchSlot, nextBranch.label ?? nextBranch.kind ?? nextBranch.id);
        childSlot = Math.max(childSlot, branchSlot);
      }
    });
  };
  visit(root, 0, 0);
  return { nodes, edges };
}

function makeEdge(source: string, target: string, label?: string): WorkflowFlowEdge {
  return {
    id: `${source}-${target}`,
    source,
    target,
    label,
    markerEnd: { type: MarkerType.ArrowClosed },
    style: { strokeWidth: 1.5 },
  };
}

function findNode(root: UINode, id: string): UINode | null {
  if (root.id === id) {
    return root;
  }
  for (const child of root.children ?? []) {
    const found = findNode(child, id);
    if (found) {
      return found;
    }
  }
  for (const branch of root.branches ?? []) {
    for (const child of branch.children ?? []) {
      const found = findNode(child, id);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

function updateNode(document: UIDocument, id: string, update: (node: UINode) => UINode): UIDocument {
  return { ...document, root: updateNodeRecursive(document.root, id, update) };
}

function updateNodeRecursive(node: UINode, id: string, update: (node: UINode) => UINode): UINode {
  const nextNode = node.id === id ? update(node) : node;
  return {
    ...nextNode,
    children: nextNode.children?.map((child) => updateNodeRecursive(child, id, update)),
    branches: nextNode.branches?.map((branch) => ({
      ...branch,
      children: branch.children?.map((child) => updateNodeRecursive(child, id, update)),
    })),
  };
}

async function requestJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}

function normalizeAPIError(error: unknown): { message: string; diagnostics: Diagnostic[]; network: boolean } {
  const message = formatError(error);
  return {
    message,
    diagnostics: [{ severity: "error", code: "workflow.api", message }],
    network: message.includes("Failed to fetch") || message.includes("Request failed"),
  };
}

function makeOperationId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}`;
}

function normalizeBindingTokens(value: unknown): BindingToken[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return [];
    }
    const token = item as Record<string, unknown>;
    const ref = typeof token.ref === "string" ? token.ref : "";
    if (!ref) {
      return [];
    }
    return [
      {
        group: typeof token.group === "string" && token.group ? token.group : "References",
        ref,
        label: typeof token.label === "string" && token.label ? token.label : ref,
        type: typeof token.type === "string" && token.type ? token.type : undefined,
        detail: typeof token.detail === "string" && token.detail ? token.detail : undefined,
      },
    ];
  });
}

function groupBindingTokens(tokens: BindingToken[]) {
  const order = ["Inputs", "Global State", "Upstream Outputs", "Context Loop", "References"];
  const groups = new Map<string, BindingToken[]>();
  for (const token of tokens) {
    groups.set(token.group, [...(groups.get(token.group) ?? []), token]);
  }
  return [...groups.entries()]
    .sort(([left], [right]) => {
      const leftIndex = order.indexOf(left);
      const rightIndex = order.indexOf(right);
      return (leftIndex === -1 ? order.length : leftIndex) - (rightIndex === -1 ? order.length : rightIndex);
    })
    .map(([name, groupTokens]) => ({ name, tokens: groupTokens }));
}

function normalizeExpression(value: unknown): { kind: ExpressionKind; value?: unknown; ref?: string } {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const expression = value as Record<string, unknown>;
    if (expression.kind === "literal" || expression.kind === "ref" || expression.kind === "json") {
      return {
        kind: expression.kind,
        value: expression.value,
        ref: typeof expression.ref === "string" ? expression.ref : undefined,
      };
    }
  }
  return { kind: "json", value };
}

function buildExpression(
  kind: ExpressionKind,
  literalType: LiteralInputType,
  literalValue: string,
  refValue: string,
  jsonDraft: string,
) {
  if (kind === "json") {
    return JSON.parse(jsonDraft) as unknown;
  }
  if (kind === "ref") {
    if (!refValue.trim()) {
      throw new Error("Reference is required");
    }
    return { kind: "ref", ref: refValue.trim() };
  }
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

function literalInputType(expression: { value?: unknown }): LiteralInputType {
  if (typeof expression.value === "number") {
    return "number";
  }
  if (typeof expression.value === "boolean") {
    return "boolean";
  }
  return "string";
}

function formatLiteralInput(value: unknown) {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

function compactExpression(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return renderFieldValue(value);
  }
  const expression = value as Record<string, unknown>;
  if (expression.kind === "ref" && typeof expression.ref === "string") {
    return expression.ref;
  }
  if (expression.kind === "literal") {
    return renderFieldValue(expression.value);
  }
  if (expression.kind === "binary") {
    return `${compactExpression(expression.left)} ${typeof expression.op === "string" ? expression.op : "?"} ${compactExpression(expression.right)}`;
  }
  return typeof expression.kind === "string" ? `${expression.kind} expression` : "expression";
}

function renderFieldValue(value: unknown) {
  return formatContractValue(value);
}

function contractFieldRows(fields: InspectorField[]) {
  return fields.map((field) => ({
    path: field.path,
    label: field.label ?? shortPath(field.path),
    value: formatContractValue(field.value),
  }));
}

function formatContractValue(value: unknown) {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value == null) {
    return "null";
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    const name = typeof record.name === "string" ? record.name : "";
    const type = record.type;
    if (name && type && typeof type === "object" && !Array.isArray(type)) {
      const typeName = (type as Record<string, unknown>).name;
      if (typeof typeName === "string") {
        return `${name}: ${typeName}`;
      }
    }
  }
  return JSON.stringify(value);
}

function fieldValue(node: UINode, label: string) {
  const field = (node.inspector ?? []).find((candidate) => candidate.label === label);
  return typeof field?.value === "string" ? field.value : "";
}

function shortPath(path: string) {
  const parts = path.split(".");
  return parts.slice(-2).join(".");
}

function summarizePayload(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return renderFieldValue(payload);
  }
  const raw = JSON.stringify(payload);
  return raw.length > 120 ? `${raw.slice(0, 117)}...` : raw;
}

function formatTraceTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function runResultSummary(result: RunResult | null) {
  if (!result) {
    return "Not run";
  }
  const returns = Object.keys(result.returns ?? {});
  return returns.length > 0 ? `Returns ${returns.join(", ")}` : "Completed";
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
      return "Local only";
  }
}

function formatError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export default App;
