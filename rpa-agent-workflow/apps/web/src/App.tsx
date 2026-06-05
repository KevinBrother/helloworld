import { useEffect, useMemo, useState } from "react";
import { buildDeleteNodeOperation, buildInsertNodeOperation, type InsertNodeSpec } from "./editOperations";
import { getRunAvailability } from "./runAvailability";
import { reduceRunMessage, runWorkflowStream, type NodeRunStateMap } from "./runEvents";
import { validateWorkflowRunInputs } from "./runInputValidation";
import { findInvalidConditionOperatorRepairs } from "./runReadiness";
import { buildWorkbenchModel, type InsertAnchor, type WorkbenchField, type WorkbenchNode } from "./workbenchModel";
import { CreateNodeModal } from "./workbench/components/CreateNodeModal";
import { DeleteNodeModal } from "./workbench/components/DeleteNodeModal";
import { Header, type SaveState } from "./workbench/components/Header";
import { NodeLibrary } from "./workbench/components/NodeLibrary";
import { ParameterPanel } from "./workbench/components/ParameterPanel";
import { RunLog } from "./workbench/components/RunLog";
import { TestRunModal } from "./workbench/components/TestRunModal";
import { WorkflowCanvas } from "./workbench/components/WorkflowCanvas";
import type { BlocksResponse, BlockDefinition, Diagnostic, EditOperation, EditorStateResponse, RunResult, UIDocument, UINode } from "./types";

const DEFAULT_ACTOR = {
  id: "local-user",
  name: "Local Editor",
  kind: "human",
};

function App() {
  const [uiDocument, setUIDocument] = useState<UIDocument | null>(null);
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
  const [serverAvailable, setServerAvailable] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState("");
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [runPending, setRunPending] = useState(false);
  const [runModalOpen, setRunModalOpen] = useState(false);
  const [runLogOpen, setRunLogOpen] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("sample");
  const [status, setStatus] = useState("示例流程已加载");
  const [serviceError, setServiceError] = useState("");
  const [serviceRetrying, setServiceRetrying] = useState(true);
  const [blockQuery, setBlockQuery] = useState("");
  const [blockCatalog, setBlockCatalog] = useState<BlockDefinition[]>([]);
  const [openSourceKey, setOpenSourceKey] = useState<string | null>(null);
  const [runLines, setRunLines] = useState<string[]>(["暂无服务端运行记录。"]);
  const [nodeRunStates, setNodeRunStates] = useState<NodeRunStateMap>({});
  const [pendingInsertAnchor, setPendingInsertAnchor] = useState<InsertAnchor | null>(null);
  const [deleteModalNode, setDeleteModalNode] = useState<WorkbenchNode | null>(null);
  const [nodeEditPending, setNodeEditPending] = useState(false);

  const model = useMemo(() => (uiDocument ? buildWorkbenchModel(uiDocument, blockCatalog) : null), [uiDocument, blockCatalog]);
  const runAvailability = useMemo(() => getRunAvailability(serverAvailable, saveState), [serverAvailable, saveState]);
  const selectedNode = useMemo(
    () => model?.nodes.find((node) => node.id === selectedNodeId) ?? model?.nodes[0],
    [model, selectedNodeId],
  );
  const workflowInputNode = useMemo(() => model?.nodes.find((node) => node.kind === "sequence" && node.order === 0), [model]);
  const runInputValidation = useMemo(() => validateWorkflowRunInputs(workflowInputNode?.inputs), [workflowInputNode]);
  const filteredBlocks = useMemo(() => {
    const query = blockQuery.trim().toLowerCase();
    const blockOptions = model?.blockOptions ?? [];
    if (!query) return blockOptions;
    return blockOptions.filter((block) => `${block.key} ${block.category} ${block.detail}`.toLowerCase().includes(query));
  }, [blockQuery, model]);

  const applyServerState = (state: EditorStateResponse) => {
    setUIDocument(state.ui);
    setDiagnostics(state.diagnostics ?? []);
    setSelectedNodeId((current) => (findNode(state.ui.root, current) ? current : state.ui.root.id));
  };

  const loadWorkflowService = async (options?: { cancelled?: () => boolean; retry?: boolean }) => {
    if (options?.retry) {
      setServiceRetrying(true);
      setStatus("正在检查流程服务");
    }

    try {
      const [blocks, state] = await Promise.all([requestJSON<BlocksResponse>("/api/blocks"), loadInitialWorkflowState()]);
      if (options?.cancelled?.()) return;
      applyServerState(state);
      setBlockCatalog(blocks.blocks ?? []);
      setServerAvailable(true);
      setSaveState("saved");
      setServiceError("");
      setStatus(sourceFromURL() ? `已打开工作流：${sourceFromURL()}` : "流程服务已连接");
    } catch (error) {
      if (options?.cancelled?.()) return;
      const message = formatError(error);
      setServerAvailable(false);
      setSaveState("sample");
      setBlockCatalog([]);
      setServiceError(message);
      setStatus(`使用示例流程：${message}`);
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

    setUIDocument((current) => (current ? updateFieldValue(current, node.id, field.path, value) : current));

    if (!serverAvailable) {
      setSaveState("sample");
      setStatus("修改已在本地应用");
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
      setStatus("流程已保存");
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

  const submitServerEdit = async (operation: EditOperation, successStatus: string) => {
    if (!serverAvailable) {
      setStatus("流程服务未连接，不能修改流程结构");
      return false;
    }

    setNodeEditPending(true);
    setSaveState("saving");
    try {
      const state = await requestJSON<EditorStateResponse>("/api/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(operation),
      });
      applyServerState(state);
      setSaveState("saved");
      setStatus(successStatus);
      return true;
    } catch (error) {
      const apiError = normalizeAPIError(error);
      setSaveState("failed");
      setDiagnostics(apiError.diagnostics);
      setStatus(apiError.message);
      if (apiError.network) {
        setServerAvailable(false);
        setServiceError(apiError.message);
      }
      return false;
    } finally {
      setNodeEditPending(false);
    }
  };

  const handleInsertAtEdge = (anchor: InsertAnchor) => {
    setOpenSourceKey(null);
    if (!serverAvailable) {
      setStatus("流程服务未连接，不能新增节点");
      return;
    }
    setPendingInsertAnchor(anchor);
  };

  const handleCreateNode = async (node: InsertNodeSpec) => {
    if (!pendingInsertAnchor) return;
    const ok = await submitServerEdit(
      buildInsertNodeOperation(makeOperationId("insert"), DEFAULT_ACTOR, pendingInsertAnchor, node),
      "节点已新增",
    );
    if (ok) {
      setPendingInsertAnchor(null);
    }
  };

  const handleDeleteNode = async () => {
    if (!deleteModalNode) return;
    const ok = await submitServerEdit(buildDeleteNodeOperation(makeOperationId("delete"), DEFAULT_ACTOR, deleteModalNode), "节点已删除");
    if (ok) {
      setDeleteModalNode(null);
    }
  };

  const handleRunWorkflow = async () => {
    if (runPending) {
      setStatus("测试运行进行中，请等待当前运行完成。");
      return;
    }

    if (!runAvailability.available) {
      setOpenSourceKey(null);
      setRunModalOpen(true);
      setStatus(runAvailability.message);
      return;
    }

    if (!model) {
      setStatus("流程服务未返回工作流，不能测试运行。");
      return;
    }

    const repairs = findInvalidConditionOperatorRepairs(model);
    for (const repair of repairs) {
      await submitFieldUpdate(repair.node, repair.field, repair.value);
    }

    const validation = validateWorkflowRunInputs(workflowInputNode?.inputs);
    if (!validation.valid) {
      setOpenSourceKey(null);
      setRunModalOpen(true);
      setStatus("请先修正流程输入");
      return;
    }

    setOpenSourceKey(null);
    setRunPending(true);
    setRunModalOpen(false);
    setRunResult(null);
    setNodeRunStates({});
    setRunLines((current) => appendRunLines(current, [`[${new Date().toLocaleTimeString("en-US", { hour12: false })}] 测试运行开始`], 18));
    const timestamp = new Date().toLocaleTimeString("en-US", { hour12: false });

    const outcome = await runWorkflowStream(validation.inputs, (message) => {
      setNodeRunStates((current) => reduceRunMessage(current, message));
      if (message.type === "trace" && message.event.statementId && message.event.name === "statement.start") {
        setRunLines((current) => appendRunLines(current, [`[${timestamp}] 正在运行节点 ${message.event.statementId}`], 18));
      }
    });

    if (outcome.ok) {
      const payload = outcome.response;
      setRunResult(payload.result ?? null);
      setDiagnostics(payload.diagnostics ?? []);
      setRunLines((current) => appendRunLines(current, [`[${timestamp}] 测试运行完成`, ...formatRunLines(payload.result)], 18));
      setStatus("测试运行完成");
    } else {
      const apiError = normalizeAPIError(outcome.diagnostics[0]?.message ?? "Workflow run failed");
      setRunResult(null);
      setDiagnostics(outcome.diagnostics.length > 0 ? outcome.diagnostics : apiError.diagnostics);
      setRunLines((current) => appendRunLines(current, [`[${timestamp}] 测试运行失败：${apiError.message}`], 12));
      setStatus(apiError.message);
    }

    setRunPending(false);
  };

  const handleOpenWorkflow = async () => {
    const source = window.prompt("输入服务端工作流 source（相对路径或全路径）", sourceFromURL() ?? "examples/fs-workflow/ast.json");
    if (!source?.trim()) return;
    try {
      const state = await openWorkflowSource(source.trim());
      applyServerState(state);
      setRunResult(null);
      setSaveState("sample");
      setServerAvailable(true);
      setSaveState("saved");
      setStatus(`已打开工作流：${source.trim()}`);
    } catch (error) {
      const apiError = normalizeAPIError(error);
      setSaveState("failed");
      setDiagnostics(apiError.diagnostics);
      setStatus(`无法打开工作流：${apiError.message}`);
    }
  };

  return (
    <div className="workbench-shell">
      <Header
        runPending={runPending}
        serverAvailable={serverAvailable}
        status={status}
        workflowName={model?.workflowName ?? "Workflow Editor"}
        onOpenWorkflow={() => void handleOpenWorkflow()}
        onRun={() => {
          setOpenSourceKey(null);
          setRunModalOpen(true);
        }}
      />

      {model && selectedNode ? (
        <main className="workbench-grid">
          <NodeLibrary blocks={filteredBlocks} query={blockQuery} onQueryChange={setBlockQuery} />
          <WorkflowCanvas
            model={model}
            nodeRunStates={nodeRunStates}
            selectedId={selectedNode.id}
            onInsertAtEdge={handleInsertAtEdge}
            onSelect={(id) => {
              setOpenSourceKey(null);
              setSelectedNodeId(id);
            }}
          />
          <ParameterPanel
            errors={selectedNode.id === workflowInputNode?.id ? runInputValidation.errors : {}}
            model={model}
            node={selectedNode}
            openSourceKey={openSourceKey}
            onDeleteNode={(node) => setDeleteModalNode(node)}
            onOpenSourceKeyChange={setOpenSourceKey}
            onFieldChange={(field, value) => void submitFieldUpdate(selectedNode, field, value)}
          />
        </main>
      ) : (
        <main className="workbench-grid">
          <section className="panel canvas-panel">
            <div className="empty-state">正在连接流程服务。</div>
          </section>
        </main>
      )}

      <RunLog lines={runLines} open={runLogOpen} result={runResult} onOpenChange={setRunLogOpen} />

      {runModalOpen && model ? (
        <TestRunModal
          errors={runInputValidation.errors}
          model={model}
          pending={runPending}
          runMessage={runAvailability.message}
          workflowInputNode={workflowInputNode}
          openSourceKey={openSourceKey}
          onClose={() => setRunModalOpen(false)}
          onFieldChange={(field, value) => {
            if (workflowInputNode) {
              void submitFieldUpdate(workflowInputNode, field, value);
            }
          }}
          onOpenSourceKeyChange={setOpenSourceKey}
          onRun={() => void handleRunWorkflow()}
        />
      ) : null}

      {pendingInsertAnchor ? (
        <CreateNodeModal
          blocks={model.blockOptions}
          pending={nodeEditPending}
          onClose={() => setPendingInsertAnchor(null)}
          onConfirm={(node) => void handleCreateNode(node)}
        />
      ) : null}

      {deleteModalNode ? (
        <DeleteNodeModal
          node={deleteModalNode}
          pending={nodeEditPending}
          onClose={() => setDeleteModalNode(null)}
          onConfirm={() => void handleDeleteNode()}
        />
      ) : null}
    </div>
  );
}

function updateFieldValue(document: UIDocument, nodeId: string, path: string, value: unknown): UIDocument {
  return {
    ...document,
    root: updateNodeRecursive(document.root, nodeId, (node) => ({
      ...node,
      inspector: (node.inspector ?? []).map((field) => updateInspectorFieldValue(field, path, value)),
    })),
  };
}

function updateInspectorFieldValue(field: NonNullable<UINode["inspector"]>[number], path: string, value: unknown) {
  if (field.path === path) {
    return { ...field, value };
  }

  if (!path.startsWith(`${field.path}.`) || field.label !== "Condition" || !isRecord(field.value) || field.value.kind !== "binary") {
    return field;
  }

  const segment = path.slice(field.path.length + 1);
  if (segment === "operator" && isRecord(value)) {
    const nextValue = { ...field.value, operator: value };
    if (value.kind === "literal") {
      return { ...field, value: { ...nextValue, op: value.value } };
    }
    return { ...field, value: nextValue };
  }
  if (segment === "left" || segment === "right") {
    return { ...field, value: { ...field.value, [segment]: value } };
  }

  return field;
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

function loadInitialWorkflowState() {
  const source = sourceFromURL();
  if (source) {
    return openWorkflowSource(source);
  }
  return requestJSON<EditorStateResponse>("/api/workflow");
}

function openWorkflowSource(source: string) {
  return requestJSON<EditorStateResponse>("/api/workflow/open", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source }),
  });
}

function sourceFromURL() {
  return new URLSearchParams(window.location.search).get("workflow")?.trim() || null;
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
  if (!result) return ["未返回结果数据"];
  const lines: string[] = [];
  if (result.inputs) lines.push(`输入 = ${JSON.stringify(result.inputs)}`);
  if (result.nodeOutputs) lines.push(`节点输出 = ${JSON.stringify(result.nodeOutputs)}`);
  if (result.returns) lines.push(`返回 = ${JSON.stringify(result.returns)}`);
  return lines;
}

function appendRunLines(current: string[], next: string[], limit: number) {
  return [...current.filter((line) => line !== "暂无服务端运行记录。"), ...next].slice(-limit);
}

function getWorkflowRunInputs(model: ReturnType<typeof buildWorkbenchModel>) {
  const startNode = model.nodes.find((node) => node.kind === "sequence" && node.order === 0);
  if (!startNode) return {};
  return Object.fromEntries(startNode.inputs.map((field) => [field.key, toRunInputValue(field.value)]));
}

function toRunInputValue(value: unknown): unknown {
  if (isRecord(value) && value.kind === "literal") {
    return value.value;
  }
  return value;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export default App;
