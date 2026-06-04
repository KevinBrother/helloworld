import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileUp,
  Play,
  RefreshCw,
  Save,
  Search,
  X,
} from "lucide-react";
import sampleDocument from "../../../output/calculator-ui-node.json";
import {
  buildWorkbenchModel,
  getFieldSourceId,
  getNodeIoLabel,
  getResolvedFieldValue,
  getSourceOptions,
  makeFieldValueFromSource,
  type WorkbenchField,
  type WorkbenchModel,
  type WorkbenchNode,
} from "./workbenchModel";
import type { Diagnostic, EditOperation, EditorStateResponse, RunResult, RunResponse, UIDocument, UINode } from "./types";

type SaveState = "sample" | "saved" | "saving" | "failed";

const DEFAULT_ACTOR = {
  id: "local-user",
  name: "Local Editor",
  kind: "human",
};

function App() {
  const [uiDocument, setUIDocument] = useState<UIDocument>(() => sampleDocument as UIDocument);
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
  const [serverAvailable, setServerAvailable] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState(() => (sampleDocument as UIDocument).root.id);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [runPending, setRunPending] = useState(false);
  const [runModalOpen, setRunModalOpen] = useState(false);
  const [runLogOpen, setRunLogOpen] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("sample");
  const [status, setStatus] = useState("Sample workflow loaded");
  const [serviceError, setServiceError] = useState("");
  const [serviceRetrying, setServiceRetrying] = useState(true);
  const [blockQuery, setBlockQuery] = useState("");
  const [openSourceKey, setOpenSourceKey] = useState<string | null>(null);
  const [runLines, setRunLines] = useState<string[]>([
    "[10:42:01] test run started: calculator",
    "[10:42:01] left = 12, operator = +, right = 7",
    "[10:42:01] condition selected then path",
    "[10:42:01] math.calculate result = 19",
    "[10:42:01] workflow result = 19",
  ]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const model = useMemo(() => buildWorkbenchModel(uiDocument), [uiDocument]);
  const selectedNode = useMemo(
    () => model.nodes.find((node) => node.id === selectedNodeId) ?? model.nodes[0],
    [model.nodes, selectedNodeId],
  );
  const filteredBlocks = useMemo(() => {
    const query = blockQuery.trim().toLowerCase();
    if (!query) return model.blockOptions;
    return model.blockOptions.filter((block) => `${block.key} ${block.category} ${block.detail}`.toLowerCase().includes(query));
  }, [blockQuery, model.blockOptions]);

  const applyServerState = (state: EditorStateResponse) => {
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
      if (options?.cancelled?.()) return;
      applyServerState(state);
      setServerAvailable(true);
      setSaveState("saved");
      setServiceError("");
      setStatus("Workflow service connected");
    } catch (error) {
      if (options?.cancelled?.()) return;
      const message = formatError(error);
      setServerAvailable(false);
      setSaveState("sample");
      setServiceError(message);
      setStatus(`Sample workflow active: ${message}`);
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

  const submitFieldUpdate = async (node: WorkbenchNode, field: WorkbenchField, value: unknown) => {
    const operation: EditOperation = {
      schemaVersion: "1.0.0",
      operationId: makeOperationId("update"),
      type: "updateField",
      targetNodeId: node.id,
      path: field.path,
      payload: { value },
      actor: DEFAULT_ACTOR,
    };

    if (!serverAvailable) {
      setUIDocument((current) => updateFieldValue(current, node.id, field.path, value));
      setSaveState("sample");
      setStatus("Change applied locally");
      return;
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
      setStatus("Workflow saved");
    } catch (error) {
      const apiError = normalizeAPIError(error);
      setSaveState("failed");
      setDiagnostics(apiError.diagnostics);
      setStatus(apiError.message);
      if (apiError.network) {
        setServerAvailable(false);
        setServiceError(apiError.message);
      }
    }
  };

  const handleRunWorkflow = async () => {
    setOpenSourceKey(null);
    setRunPending(true);
    setRunModalOpen(false);
    const timestamp = new Date().toLocaleTimeString("en-US", { hour12: false });

    if (!serverAvailable) {
      setRunResult({
        inputs: { left: 12, operator: "+", right: 7 },
        returns: { result: 19 },
        nodeOutputs: { branch_by_threshold: { result: 19 } },
      });
      setRunLines((current) =>
        [`[${timestamp}] sample test run: result = 19`, `[${timestamp}] using local projection data`, ...current].slice(0, 12),
      );
      setStatus("Sample test run completed");
      setRunPending(false);
      return;
    }

    try {
      const payload = await requestJSON<RunResponse>("/api/run", { method: "POST" });
      setRunResult(payload.result ?? null);
      setDiagnostics(payload.diagnostics ?? []);
      setRunLines((current) => [`[${timestamp}] test run completed`, ...formatRunLines(payload.result), ...current].slice(0, 18));
      setStatus("Test run completed");
    } catch (error) {
      const apiError = normalizeAPIError(error);
      setRunResult(null);
      setDiagnostics(apiError.diagnostics);
      setRunLines((current) => [`[${timestamp}] test run failed: ${apiError.message}`, ...current].slice(0, 12));
      setStatus(apiError.message);
    } finally {
      setRunPending(false);
    }
  };

  const handleLoadJSON = async (file: File | undefined) => {
    if (!file) return;
    try {
      const loaded = JSON.parse(await file.text()) as UIDocument;
      setUIDocument(loaded);
      setSelectedNodeId(loaded.root.id);
      setRunResult(null);
      setDiagnostics([]);
      setSaveState("sample");
      setStatus(`Loaded ${loaded.workflowId}`);
    } catch (error) {
      setStatus(`Could not load JSON: ${formatError(error)}`);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="workbench-shell">
      <Header
        diagnostics={diagnostics}
        runPending={runPending}
        saveState={saveState}
        serverAvailable={serverAvailable}
        serviceError={serviceError}
        serviceRetrying={serviceRetrying}
        status={status}
        workflowName={model.workflowName}
        onLoadJSON={() => fileInputRef.current?.click()}
        onRetry={() => void loadWorkflowService({ retry: true })}
        onRun={() => {
          setOpenSourceKey(null);
          setRunModalOpen(true);
        }}
      />

      <input
        ref={fileInputRef}
        aria-label="Load workflow JSON"
        className="visually-hidden-file"
        type="file"
        accept="application/json,.json"
        onChange={(event) => void handleLoadJSON(event.target.files?.[0])}
      />

      <main className="workbench-grid">
        <NodeLibrary blocks={filteredBlocks} query={blockQuery} onQueryChange={setBlockQuery} />
        <WorkflowCanvas
          model={model}
          selectedId={selectedNode.id}
          onSelect={(id) => {
            setOpenSourceKey(null);
            setSelectedNodeId(id);
          }}
        />
        <ParameterPanel
          model={model}
          node={selectedNode}
          openSourceKey={openSourceKey}
          onOpenSourceKeyChange={setOpenSourceKey}
          onFieldChange={(field, value) => void submitFieldUpdate(selectedNode, field, value)}
        />
      </main>

      <RunLog lines={runLines} open={runLogOpen} result={runResult} onOpenChange={setRunLogOpen} />

      {runModalOpen ? (
        <TestRunModal
          pending={runPending}
          serverAvailable={serverAvailable}
          onClose={() => setRunModalOpen(false)}
          onRun={() => void handleRunWorkflow()}
        />
      ) : null}
    </div>
  );
}

function Header({
  diagnostics,
  runPending,
  saveState,
  serverAvailable,
  serviceError,
  serviceRetrying,
  status,
  workflowName,
  onLoadJSON,
  onRetry,
  onRun,
}: {
  diagnostics: Diagnostic[];
  runPending: boolean;
  saveState: SaveState;
  serverAvailable: boolean;
  serviceError: string;
  serviceRetrying: boolean;
  status: string;
  workflowName: string;
  onLoadJSON: () => void;
  onRetry: () => void;
  onRun: () => void;
}) {
  return (
    <header className="workbench-header">
      <div className="product-title">
        <span>Workflow Workbench</span>
        <h1>{workflowName}</h1>
      </div>
      <div className="header-status" aria-live="polite">
        <StatusPill tone={serverAvailable ? "ok" : "warn"}>{serverAvailable ? "Connected" : "Local sample"}</StatusPill>
        <StatusPill tone={saveState === "failed" ? "danger" : saveState === "saved" ? "ok" : "neutral"}>{saveLabel(saveState)}</StatusPill>
        {diagnostics.length > 0 ? <StatusPill tone="warn">{diagnostics.length} issues</StatusPill> : <StatusPill tone="ok">No issues</StatusPill>}
        <p>{status}</p>
        {!serverAvailable && serviceError ? (
          <button className="link-button" disabled={serviceRetrying} onClick={onRetry}>
            <RefreshCw size={15} />
            Retry service
          </button>
        ) : null}
      </div>
      <div className="header-actions">
        <button className="secondary-button" onClick={onLoadJSON}>
          <FileUp size={17} />
          Load JSON
        </button>
        <button className="secondary-button" disabled={!serverAvailable}>
          <Save size={17} />
          Save workflow
        </button>
        <button className="primary-button" onClick={onRun} disabled={runPending}>
          <Play size={17} />
          {runPending ? "Running" : "Test run"}
        </button>
      </div>
    </header>
  );
}

function NodeLibrary({
  blocks,
  query,
  onQueryChange,
}: {
  blocks: WorkbenchModel["blockOptions"];
  query: string;
  onQueryChange: (value: string) => void;
}) {
  return (
    <aside className="panel node-library">
      <PanelHeading title="Block library" detail={`${blocks.length} available`} />
      <label className="search-field">
        <Search size={16} />
        <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search block or control node" />
      </label>
      <div className="block-list">
        {blocks.map((block) => (
          <button className="block-option" key={block.key}>
            <span>
              <strong>{block.key}</strong>
              <small>{block.detail}</small>
            </span>
            <em>{block.category}</em>
            {block.instances > 0 ? <b>{block.instances}</b> : null}
          </button>
        ))}
      </div>
    </aside>
  );
}

function WorkflowCanvas({
  model,
  selectedId,
  onSelect,
}: {
  model: WorkbenchModel;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <section className="panel canvas-panel">
      <PanelHeading title="Canvas" detail="Select a node to configure it" />
      <div className="canvas-scroll">
        <NodeSequence nodes={[model.root]} model={model} selectedId={selectedId} onSelect={onSelect} root />
      </div>
    </section>
  );
}

function NodeSequence({
  nodes,
  model,
  selectedId,
  onSelect,
  root = false,
}: {
  nodes: UINode[];
  model: WorkbenchModel;
  selectedId: string;
  onSelect: (id: string) => void;
  root?: boolean;
}) {
  return (
    <div className={root ? "node-sequence root-sequence" : "node-sequence"}>
      {nodes.map((node, index) => (
        <div className="sequence-item" key={node.id}>
          {index > 0 || root ? <div className="flow-line" /> : null}
          <CanvasNode node={model.nodes.find((candidate) => candidate.id === node.id)} selected={selectedId === node.id} onSelect={onSelect} />
          {node.branches?.length ? (
            <div className="branch-layout">
              {node.branches.map((branch) => (
                <div className="branch-column" key={branch.id}>
                  <span>{branch.label ?? branch.kind}</span>
                  <NodeSequence nodes={branch.children ?? []} model={model} selectedId={selectedId} onSelect={onSelect} />
                </div>
              ))}
            </div>
          ) : null}
          {node.children?.length ? <NodeSequence nodes={node.children} model={model} selectedId={selectedId} onSelect={onSelect} /> : null}
        </div>
      ))}
    </div>
  );
}

function CanvasNode({ node, selected, onSelect }: { node?: WorkbenchNode; selected: boolean; onSelect: (id: string) => void }) {
  if (!node) return null;

  return (
    <button className={selected ? "canvas-node selected" : "canvas-node"} onClick={() => onSelect(node.id)}>
      <span className="node-kind">{node.kind === "sequence" && node.order === 0 ? "Workflow Inputs" : node.kind}</span>
      <strong>{node.kind === "return" ? "Return result" : node.label}</strong>
      {node.branch ? <small>{node.branch}</small> : null}
      <div className="node-io">
        {getNodeIoLabel(node).map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </button>
  );
}

function ParameterPanel({
  model,
  node,
  openSourceKey,
  onOpenSourceKeyChange,
  onFieldChange,
}: {
  model: WorkbenchModel;
  node: WorkbenchNode;
  openSourceKey: string | null;
  onOpenSourceKeyChange: (key: string | null) => void;
  onFieldChange: (field: WorkbenchField, value: unknown) => void;
}) {
  const title = node.kind === "sequence" && node.order === 0 ? "Workflow Inputs" : node.kind === "return" ? "Return result" : node.label;
  const showInputs = node.kind !== "return" && node.inputs.length > 0;
  const showOutputs = node.kind !== "sequence" && node.outputs.length > 0;

  return (
    <aside className="panel parameter-panel">
      <PanelHeading title="Parameters" detail={node.path ?? node.id} />
      <div className="selected-node-summary">
        <div>
          <h2>{title}</h2>
          <span>{node.kind}</span>
        </div>
        {node.branch ? <b>{node.branch}</b> : null}
      </div>

      {showInputs ? (
        <SchemaSection title={node.kind === "sequence" ? "Workflow inputs" : "Inputs"}>
          {node.inputs.map((field) => (
            <FieldRow
              field={field}
              key={field.path}
              model={model}
              node={node}
              openSourceKey={openSourceKey}
              onFieldChange={onFieldChange}
              onOpenSourceKeyChange={onOpenSourceKeyChange}
            />
          ))}
        </SchemaSection>
      ) : null}

      {showOutputs ? (
        <SchemaSection title={node.kind === "return" ? "Workflow outputs" : "Outputs"}>
          {node.outputs.map((field) => (
            <FieldRow
              field={field}
              key={field.path}
              model={model}
              node={node}
              openSourceKey={openSourceKey}
              onFieldChange={onFieldChange}
              onOpenSourceKeyChange={onOpenSourceKeyChange}
            />
          ))}
        </SchemaSection>
      ) : null}

      {!showInputs && !showOutputs ? <div className="empty-state">No configurable fields for this node.</div> : null}
    </aside>
  );
}

function FieldRow({
  field,
  model,
  node,
  openSourceKey,
  onFieldChange,
  onOpenSourceKeyChange,
}: {
  field: WorkbenchField;
  model: WorkbenchModel;
  node: WorkbenchNode;
  openSourceKey: string | null;
  onFieldChange: (field: WorkbenchField, value: unknown) => void;
  onOpenSourceKeyChange: (key: string | null) => void;
}) {
  const sourceKey = `${node.id}:${field.path}`;
  const sourceOptions = getSourceOptions(model.nodes, node.id, field);
  const canChooseSource = !field.readonly && field.type !== "unknown" && sourceOptions.length > 0;
  const resolvedValue = getResolvedFieldValue(field, model.sourcesById);
  const activeSourceId = getFieldSourceId(field);

  return (
    <div className="schema-row">
      <span className="field-name">{field.label}</span>
      <code className={`field-type ${field.type}`}>{field.type}</code>
      {field.options?.length ? (
        <select
          className="value-control"
          value={String(resolvedValue)}
          onChange={(event) => onFieldChange(field, { kind: "literal", value: event.target.value })}
        >
          {field.options.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      ) : canChooseSource ? (
        <button className="value-control source-value" onClick={() => onOpenSourceKeyChange(openSourceKey === sourceKey ? null : sourceKey)}>
          {resolvedValue || "Choose source"}
          <ChevronDown size={14} />
        </button>
      ) : field.readonly ? (
        <span className="value-control readonly-value">{resolvedValue || "declared"}</span>
      ) : (
        <input
          className="value-control"
          value={String(resolvedValue)}
          onChange={(event) => onFieldChange(field, { kind: "literal", value: parseFieldInput(event.target.value, field.type) })}
        />
      )}

      {canChooseSource && openSourceKey === sourceKey ? (
        <div className="source-picker">
          {sourceOptions.map((source) => (
            <button
              className={activeSourceId === source.id ? "active" : ""}
              key={source.id}
              onClick={() => {
                onFieldChange(field, makeFieldValueFromSource(source.id));
                onOpenSourceKeyChange(null);
              }}
            >
              <span>{source.nodeLabel}</span>
              <strong>{source.output}</strong>
              <code>{source.type}</code>
              <em>{source.displayValue}</em>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function TestRunModal({
  pending,
  serverAvailable,
  onClose,
  onRun,
}: {
  pending: boolean;
  serverAvailable: boolean;
  onClose: () => void;
  onRun: () => void;
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="test-modal" role="dialog" aria-modal="true" aria-labelledby="test-run-title">
        <div className="modal-header">
          <div>
            <h2 id="test-run-title">Test run workflow</h2>
            <p>{serverAvailable ? "Run the current saved workflow." : "Run against local sample data."}</p>
          </div>
          <button className="icon-button" aria-label="Close test run" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="sample-input-grid">
          <ReadOnlyField label="left" value="12" />
          <ReadOnlyField label="operator" value="+" />
          <ReadOnlyField label="right" value="7" />
        </div>
        <div className="result-preview">Expected result: 19</div>
        <div className="modal-actions">
          <button className="secondary-button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-button" onClick={onRun} disabled={pending}>
            <Play size={17} />
            {pending ? "Running" : "Run test"}
          </button>
        </div>
      </section>
    </div>
  );
}

function RunLog({
  lines,
  open,
  result,
  onOpenChange,
}: {
  lines: string[];
  open: boolean;
  result: RunResult | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <section className={open ? "run-log open" : "run-log"}>
      <button className="run-log-header" onClick={() => onOpenChange(!open)} aria-expanded={open}>
        <span>Run output</span>
        {result?.returns ? <strong>{JSON.stringify(result.returns)}</strong> : null}
        {open ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
      </button>
      {open ? (
        <div className="run-log-body">
          {lines.map((line, index) => (
            <code key={`${line}-${index}`}>{line}</code>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function SchemaSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="schema-section">
      <h3>{title}</h3>
      <div className="schema-box">
        <span className="brace">{"{"}</span>
        {children}
        <span className="brace">{"}"}</span>
      </div>
    </section>
  );
}

function PanelHeading({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="panel-heading">
      <h2>{title}</h2>
      <span>{detail}</span>
    </div>
  );
}

function StatusPill({ children, tone }: { children: React.ReactNode; tone: "ok" | "warn" | "danger" | "neutral" }) {
  return <span className={`status-pill ${tone}`}>{children}</span>;
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <label className="readonly-field">
      <span>{label}</span>
      <input readOnly value={value} />
    </label>
  );
}

function parseFieldInput(value: string, type: WorkbenchField["type"]) {
  if (type === "number") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : value;
  }
  if (type === "boolean") return value === "true";
  return value;
}

function updateFieldValue(document: UIDocument, nodeId: string, path: string, value: unknown): UIDocument {
  return {
    ...document,
    root: updateNodeRecursive(document.root, nodeId, (node) => ({
      ...node,
      inspector: (node.inspector ?? []).map((field) => (field.path === path ? { ...field, value } : field)),
    })),
  };
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

function findNode(root: UINode, id: string): UINode | null {
  if (root.id === id) return root;
  for (const child of root.children ?? []) {
    const found = findNode(child, id);
    if (found) return found;
  }
  for (const branch of root.branches ?? []) {
    for (const child of branch.children ?? []) {
      const found = findNode(child, id);
      if (found) return found;
    }
  }
  return null;
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
    network: message.includes("Failed to fetch") || message.includes("NetworkError") || message.includes("status 500"),
  };
}

function formatRunLines(result: RunResult | null | undefined) {
  if (!result) return ["No result payload returned"];
  const lines: string[] = [];
  if (result.inputs) lines.push(`inputs = ${JSON.stringify(result.inputs)}`);
  if (result.nodeOutputs) lines.push(`node outputs = ${JSON.stringify(result.nodeOutputs)}`);
  if (result.returns) lines.push(`returns = ${JSON.stringify(result.returns)}`);
  return lines;
}

function makeOperationId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function saveLabel(state: SaveState) {
  if (state === "saved") return "Saved";
  if (state === "saving") return "Saving";
  if (state === "failed") return "Save failed";
  return "Local edits";
}

function formatError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export default App;
