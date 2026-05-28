import { useEffect, useMemo, useState } from "react";
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
import sampleDocument from "./sample-ui-node.json";
import type { EditOperation, InspectorField, UIDocument, UINode } from "./types";

type ViewMode = "outline" | "canvas" | "operations";

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
  const open = !node.collapsed;
  return (
    <div className="canvas-root">
      <NodeCard node={node} selectedId={selectedId} onSelect={onSelect} />
      {open && node.children?.length ? (
        <div className="stack">
          {node.children.map((child) => (
            <WorkflowCanvas key={child.id} node={child} selectedId={selectedId} onSelect={onSelect} />
          ))}
        </div>
      ) : null}
      {open && node.branches?.length ? (
        <div className="branch-grid">
          {node.branches.map((branch) => (
            <section key={branch.id} className="branch-column">
              <div className="branch-label">{branch.label ?? branch.kind ?? branch.id}</div>
              <div className="stack">
                {branch.children?.map((child) => (
                  <WorkflowCanvas key={child.id} node={child} selectedId={selectedId} onSelect={onSelect} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : null}
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
  onSelect: (id: string) => void;
}) {
  const selected = node.id === selectedId;
  return (
    <article className={selected ? "node-card selected" : "node-card"} onClick={() => onSelect(node.id)}>
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

function updateNode(document: UIDocument, id: string, updater: (node: UINode) => UINode): UIDocument {
  return {
    ...document,
    root: updateNodeRecursive(document.root, id, updater),
    nodes: document.nodes ? document.nodes.map((node) => (node.id === id ? updater(node) : node)) : document.nodes,
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
