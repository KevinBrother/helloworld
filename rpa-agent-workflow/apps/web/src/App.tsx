import { useEffect, useMemo, useState } from "react";
import {
  buildDeleteNodeOperation,
  buildInsertBranchOperation,
  buildInsertNodeOperation,
  buildUpdateWorkflowPortsOperation,
  type InsertNodeSpec,
} from "./editOperations";
import { getRunAvailability } from "./runAvailability";
import { reduceRunMessage, runWorkflowStream, type NodeRunStateMap } from "./runEvents";
import { validateWorkflowRunInputs } from "./runInputValidation";
import { findInvalidConditionOperatorRepairs } from "./runReadiness";
import { buildWorkbenchModel, type InsertAnchor, type WorkbenchField, type WorkbenchNode, type WorkbenchPort } from "./workbenchModel";
import { updateWorkflowPortsInDocument } from "./workflowBoundary";
import { clearWorkflowDraft, loadWorkflowDraft, normalizeWorkflowDraftForServerUI, saveWorkflowDraft } from "./workflowDraft";
import { commitPendingEditOperations } from "./workflowEditCommit";
import { workflowSourceFromSearch } from "./workflowSource";
import { CreateNodeModal } from "./workbench/components/CreateNodeModal";
import { DeleteNodeModal } from "./workbench/components/DeleteNodeModal";
import { Header, type SaveState } from "./workbench/components/Header";
import { NodeLibrary } from "./workbench/components/NodeLibrary";
import { ParameterPanel } from "./workbench/components/ParameterPanel";
import { RunLog } from "./workbench/components/RunLog";
import { RunModal } from "./workbench/components/RunModal";
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
  const [createNodeFeedback, setCreateNodeFeedback] = useState("");
  const [deleteModalNode, setDeleteModalNode] = useState<WorkbenchNode | null>(null);
  const [nodeEditPending, setNodeEditPending] = useState(false);
  const [workflowSource, setWorkflowSource] = useState<string | null>(null);
  const [pendingOperations, setPendingOperations] = useState<EditOperation[]>([]);

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
      const source = requiredWorkflowSourceFromURL();
      const [blocks, state] = await Promise.all([requestJSON<BlocksResponse>("/api/blocks"), openWorkflowSource(source)]);
      if (options?.cancelled?.()) return;
      setBlockCatalog(blocks.blocks ?? []);
      setWorkflowSource(source);
      setServerAvailable(true);
      setServiceError("");

      const draft = loadDraft(source);
      if (draft) {
        const normalizedDraft = normalizeWorkflowDraftForServerUI(draft, state.ui);
        setUIDocument(normalizedDraft.ui);
        setDiagnostics(state.diagnostics ?? []);
        setSelectedNodeId(findNode(normalizedDraft.ui.root, normalizedDraft.selectedNodeId) ? normalizedDraft.selectedNodeId : normalizedDraft.ui.root.id);
        setPendingOperations(normalizedDraft.pendingOperations);
        saveDraft(normalizedDraft);
        setSaveState(normalizedDraft.pendingOperations.length > 0 ? "sample" : "saved");
        setStatus(normalizedDraft.pendingOperations.length > 0 ? `已恢复本地草稿：${source}` : `已恢复本地运行输入：${source}`);
      } else {
        applyServerState(state);
        setPendingOperations([]);
        setSaveState("saved");
        setStatus(`已打开工作流：${source}`);
      }
    } catch (error) {
      if (options?.cancelled?.()) return;
      const message = formatError(error);
      setServerAvailable(false);
      setSaveState("sample");
      setBlockCatalog([]);
      setServiceError(message);
      setStatus(message);
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
    if (!uiDocument) {
      setStatus("流程尚未加载，不能修改字段。");
      return;
    }

    const operation: EditOperation = {
      schemaVersion: "1.0.0",
      operationId: makeOperationId("update"),
      type: "updateField",
      targetNodeId: node.id,
      path: field.path,
      payload: { value },
      actor: DEFAULT_ACTOR,
    };

    const workflowRunInput = isWorkflowRunInputField(node, field);
    const nextDocument = workflowRunInput ? updateWorkflowRunInputValue(uiDocument, field.key, value) : updateFieldValue(uiDocument, node.id, field.path, value);
    const nextOperations = workflowRunInput ? pendingOperations : [...pendingOperations, operation];
    setUIDocument(nextDocument);
    setPendingOperations(nextOperations);

    if (workflowSource) {
      saveDraft({
        pendingOperations: nextOperations,
        selectedNodeId,
        source: workflowSource,
        ui: nextDocument,
      });
    }

    setSaveState(nextOperations.length > 0 ? "sample" : "saved");
    if (!workflowSource) {
      setStatus("URL 缺少 workflow 的 ast.json 绝对路径，不能保存草稿。");
    } else if (workflowRunInput) {
      setStatus("运行输入已保存到本地");
    } else {
      setStatus("修改已保存到本地草稿");
    }
  };

  const submitWorkflowPortsUpdate = (node: WorkbenchNode, direction: "inputs" | "outputs", ports: WorkbenchPort[]) => {
    if (!uiDocument) {
      setStatus("流程尚未加载，不能修改参数。");
      return;
    }

    const operation = buildUpdateWorkflowPortsOperation(
      makeOperationId(`update-${direction}`),
      DEFAULT_ACTOR,
      direction === "inputs" ? "root" : node.id,
      direction,
      ports.map((port) => port.value),
    );
    const nextDocument = updateWorkflowPortsInDocument(uiDocument, direction, ports, node.id, direction === "inputs" ? node.inputPorts : node.outputPorts);
    const nextOperations = [...pendingOperations, operation];
    setUIDocument(nextDocument);
    setPendingOperations(nextOperations);

    if (workflowSource) {
      saveDraft({
        pendingOperations: nextOperations,
        selectedNodeId,
        source: workflowSource,
        ui: nextDocument,
      });
    }

    setSaveState("sample");
    setStatus(workflowSource ? "参数声明已保存到本地草稿" : "URL 缺少 workflow 的 ast.json 绝对路径，不能保存草稿。");
  };

  const commitWorkflowEdit = (operation: EditOperation) =>
    requestJSON<EditorStateResponse>("/api/edit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(operation),
    });

  const finishPendingDraftCommit = (latestState: EditorStateResponse | null) => {
    const savedState = latestState ? preserveWorkflowRunInputs(latestState, uiDocument) : null;
    if (savedState) applyServerState(savedState);
    setPendingOperations([]);
    if (workflowSource) {
      if (savedState) {
        saveDraft({
          pendingOperations: [],
          selectedNodeId,
          source: workflowSource,
          ui: savedState.ui,
        });
      } else {
        clearDraft(workflowSource);
      }
    }
    setSaveState("saved");
  };

  const handleEditCommitError = (error: unknown) => {
    const apiError = normalizeAPIError(error);
    setSaveState("failed");
    setDiagnostics(apiError.diagnostics);
    setStatus(apiError.message);
    if (apiError.network) {
      setServerAvailable(false);
      setServiceError(apiError.message);
    }
  };

  const commitPendingDraftToServer = async (successStatus: string) => {
    if (pendingOperations.length === 0) return true;
    if (!workflowSource) {
      setStatus("URL 缺少 workflow 的 ast.json 绝对路径，不能保存草稿。");
      return false;
    }
    if (!serverAvailable) {
      setStatus("流程服务未连接，不能保存草稿。");
      return false;
    }

    setNodeEditPending(true);
    setSaveState("saving");
    setStatus("正在保存本地草稿");
    try {
      const latestState = await commitPendingEditOperations(pendingOperations, commitWorkflowEdit);
      finishPendingDraftCommit(latestState);
      setStatus(successStatus);
      return true;
    } catch (error) {
      handleEditCommitError(error);
      return false;
    } finally {
      setNodeEditPending(false);
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
      const state = await commitWorkflowEdit(operation);
      applyServerState(state);
      setSaveState("saved");
      setStatus(successStatus);
      return true;
    } catch (error) {
      handleEditCommitError(error);
      return false;
    } finally {
      setNodeEditPending(false);
    }
  };

  const handleInsertAtEdge = async (anchor: InsertAnchor) => {
    setOpenSourceKey(null);
    if (!serverAvailable) {
      setStatus("流程服务未连接，不能新增节点");
      return;
    }
    if (!(await commitPendingDraftToServer("本地草稿已保存"))) return;
    setCreateNodeFeedback("");
    setPendingInsertAnchor(anchor);
  };

  const handleCreateNode = async (node: InsertNodeSpec) => {
    if (!pendingInsertAnchor) {
      setCreateNodeFeedback("新增位置已失效，请重新选择插入位置。");
      return;
    }
    if (pendingOperations.length > 0) {
      setCreateNodeFeedback("正在保存本地草稿...");
      if (!(await commitPendingDraftToServer("本地草稿已保存"))) {
        setCreateNodeFeedback("保存本地草稿失败，请查看顶部状态和诊断信息。");
        return;
      }
    }
    if (!serverAvailable) {
      const message = "流程服务未连接，不能新增节点";
      setCreateNodeFeedback(message);
      setStatus(message);
      return;
    }
    setCreateNodeFeedback("正在新增节点...");
    const ok = await submitServerEdit(
      buildInsertNodeOperation(makeOperationId("insert"), DEFAULT_ACTOR, pendingInsertAnchor, node),
      "节点已新增",
    );
    if (ok) {
      setCreateNodeFeedback("");
      setPendingInsertAnchor(null);
    } else {
      setCreateNodeFeedback("新增失败，请查看顶部状态和诊断信息。");
    }
  };

  const handleInsertBranch = async (nodeId: string, branchKind: "condition" | "parallel") => {
    setOpenSourceKey(null);
    if (!serverAvailable) {
      setStatus("流程服务未连接，不能新增分支");
      return;
    }
    if (!(await commitPendingDraftToServer("本地草稿已保存"))) return;
    await submitServerEdit(buildInsertBranchOperation(makeOperationId("branch"), DEFAULT_ACTOR, nodeId, branchKind), "分支已新增");
  };

  const handleDeleteNode = async () => {
    if (!deleteModalNode) return;
    if (!(await commitPendingDraftToServer("本地草稿已保存"))) return;
    const ok = await submitServerEdit(buildDeleteNodeOperation(makeOperationId("delete"), DEFAULT_ACTOR, deleteModalNode), "节点已删除");
    if (ok) {
      setDeleteModalNode(null);
    }
  };

  const handleSaveWorkflow = async () => {
    if (saveState === "saving") {
      setStatus("流程保存中，请等待当前保存完成。");
      return;
    }
    if (!workflowSource) {
      setStatus("URL 缺少 workflow 的 ast.json 绝对路径，不能保存流程。");
      return;
    }
    if (!serverAvailable) {
      setStatus("流程服务未连接，不能保存到服务端。");
      return;
    }
    if (pendingOperations.length === 0) {
      setSaveState("saved");
      setStatus("运行输入已保存在本地，没有流程修改需要同步。");
      return;
    }

    await commitPendingDraftToServer("流程已保存到服务端");
  };

  const handleRunWorkflow = async () => {
    if (runPending) {
      setStatus("运行进行中，请等待当前运行完成。");
      return;
    }

    if (!runAvailability.available) {
      setOpenSourceKey(null);
      setRunModalOpen(true);
      setStatus(runAvailability.message);
      return;
    }

    if (!model) {
      setStatus("流程服务未返回工作流，不能运行。");
      return;
    }

    const repairs = findInvalidConditionOperatorRepairs(model);
    for (const repair of repairs) {
      await submitFieldUpdate(repair.node, repair.field, repair.value);
    }
    if (repairs.length > 0) {
      setStatus("已修正本地草稿，请保存流程后再运行。");
      return;
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
    setRunLines((current) => appendRunLines(current, [`[${new Date().toLocaleTimeString("en-US", { hour12: false })}] 运行开始`], 18));
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
      setRunLines((current) => appendRunLines(current, [`[${timestamp}] 运行完成`, ...formatRunLines(payload.result)], 18));
      setStatus("运行完成");
    } else {
      const apiError = normalizeAPIError(outcome.diagnostics[0]?.message ?? "Workflow run failed");
      setRunResult(null);
      setDiagnostics(outcome.diagnostics.length > 0 ? outcome.diagnostics : apiError.diagnostics);
      setRunLines((current) => appendRunLines(current, [`[${timestamp}] 运行失败：${apiError.message}`], 12));
      setStatus(apiError.message);
    }

    setRunPending(false);
  };

  return (
    <div className="workbench-shell">
      <Header
        runPending={runPending}
        status={status}
        workflowName={model?.workflowName ?? "Workflow Editor"}
        onSave={() => void handleSaveWorkflow()}
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
            onInsertBranch={handleInsertBranch}
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
            onWorkflowPortsChange={(direction, ports) => submitWorkflowPortsUpdate(selectedNode, direction, ports)}
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
        <RunModal
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
          feedback={createNodeFeedback}
          pending={nodeEditPending}
          onClose={() => {
            setCreateNodeFeedback("");
            setPendingInsertAnchor(null);
          }}
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

function updateWorkflowRunInputValue(document: UIDocument, key: string, value: unknown): UIDocument {
  const currentValues = workflowInputValues(document);
  return {
    ...document,
    metadata: {
      ...document.metadata,
      workflowInputValues: {
        ...currentValues,
        [key]: value,
      },
    },
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

function preserveWorkflowRunInputs(state: EditorStateResponse, sourceDocument: UIDocument | null): EditorStateResponse {
  if (!sourceDocument) return state;
  return {
    ...state,
    ui: {
      ...state.ui,
      metadata: {
        ...state.ui.metadata,
        workflowInputValues: workflowInputValues(sourceDocument),
      },
    },
  };
}

function workflowInputValues(document: UIDocument) {
  const value = document.metadata?.workflowInputValues;
  return isRecord(value) ? value : {};
}

function isWorkflowRunInputField(node: WorkbenchNode, field: WorkbenchField) {
  return node.kind === "sequence" && node.order === 0 && isWorkflowInputPath(field.path);
}

function isWorkflowInputPath(path: string | undefined): path is string {
  return typeof path === "string" && path.startsWith("$.inputs.");
}

function workflowInputKey(path: string | undefined) {
  if (!isWorkflowInputPath(path)) return "";
  return path.slice("$.inputs.".length);
}

async function requestJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const diagnostics = await responseDiagnostics(response);
    const message = diagnostics[0]?.message ?? `Request failed with status ${response.status}`;
    throw new WorkflowRequestError(message, diagnostics);
  }
  return (await response.json()) as T;
}

function openWorkflowSource(source: string) {
  return requestJSON<EditorStateResponse>("/api/workflow/open", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source }),
  });
}

function requiredWorkflowSourceFromURL() {
  const result = workflowSourceFromSearch(window.location.search);
  if ("source" in result && result.source) return result.source;
  if ("error" in result) throw new Error(result.error);
  throw new Error("URL 缺少 workflow 参数，请提供 ast.json 的绝对路径。");
}

async function responseDiagnostics(response: Response): Promise<Diagnostic[]> {
  try {
    const payload = (await response.json()) as { diagnostics?: Diagnostic[] };
    return payload.diagnostics ?? [];
  } catch {
    return [];
  }
}

function normalizeAPIError(error: unknown): { message: string; diagnostics: Diagnostic[]; network: boolean } {
  if (error instanceof WorkflowRequestError) {
    return {
      message: error.message,
      diagnostics: error.diagnostics.length > 0 ? error.diagnostics : [{ severity: "error", code: "workflow.api", message: error.message }],
      network: false,
    };
  }
  const message = formatError(error);
  return {
    message,
    diagnostics: [{ severity: "error", code: "workflow.api", message }],
    network: message.includes("Failed to fetch") || message.includes("NetworkError") || message.includes("status 500"),
  };
}

function loadDraft(source: string) {
  const storage = browserStorage();
  return storage ? loadWorkflowDraft(storage, source) : null;
}

function saveDraft(draft: Parameters<typeof saveWorkflowDraft>[1]) {
  const storage = browserStorage();
  if (storage) saveWorkflowDraft(storage, draft);
}

function clearDraft(source: string) {
  const storage = browserStorage();
  if (storage) clearWorkflowDraft(storage, source);
}

function browserStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

class WorkflowRequestError extends Error {
  constructor(
    message: string,
    readonly diagnostics: Diagnostic[],
  ) {
    super(message);
  }
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

function formatError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export default App;
