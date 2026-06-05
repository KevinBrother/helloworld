import { describe, expect, it } from "vitest";
import type { EditOperation, UIDocument } from "./types";
import { clearWorkflowDraft, loadWorkflowDraft, normalizeWorkflowDraftForServerUI, saveWorkflowDraft } from "./workflowDraft";

describe("workflow draft persistence", () => {
  it("persists local ui state and pending edit operations by absolute ast source", () => {
    const storage = new MemoryStorage();
    const source = "/Volumes/doc/workspace/project/helloworld/rpa-agent-workflow/examples/fs-workflow/ast.json";
    const ui = uiDocument("fs_workflow");
    const operation = editOperation("update-dir");

    saveWorkflowDraft(storage, {
      pendingOperations: [operation],
      selectedNodeId: "root",
      source,
      ui,
    });

    expect(loadWorkflowDraft(storage, source)).toEqual({
      pendingOperations: [operation],
      selectedNodeId: "root",
      source,
      ui,
    });
  });

  it("clears a saved workflow draft", () => {
    const storage = new MemoryStorage();
    const source = "/Volumes/doc/workspace/project/helloworld/rpa-agent-workflow/examples/fs-workflow/ast.json";

    saveWorkflowDraft(storage, {
      pendingOperations: [editOperation("update-dir")],
      selectedNodeId: "root",
      source,
      ui: uiDocument("fs_workflow"),
    });
    clearWorkflowDraft(storage, source);

    expect(loadWorkflowDraft(storage, source)).toBeNull();
  });

  it("persists workflow run input values without requiring server edit operations", () => {
    const storage = new MemoryStorage();
    const source = "/Volumes/doc/workspace/project/helloworld/rpa-agent-workflow/examples/fs-workflow/ast.json";
    const ui = {
      ...uiDocument("fs_workflow"),
      metadata: {
        workflowInputValues: {
          dir: "/tmp/input",
          outputPath: "/tmp/out.txt",
        },
      },
    };

    saveWorkflowDraft(storage, {
      pendingOperations: [],
      selectedNodeId: "root",
      source,
      ui,
    });

    expect(loadWorkflowDraft(storage, source)?.ui.metadata).toEqual({
      workflowInputValues: {
        dir: "/tmp/input",
        outputPath: "/tmp/out.txt",
      },
    });
  });

  it("restores saved run inputs onto the latest server UI when there are no pending structural edits", () => {
    const source = "/Volumes/doc/workspace/project/helloworld/rpa-agent-workflow/examples/fs-workflow/ast.json";
    const staleDraftUI = {
      ...uiDocument("fs_workflow"),
      metadata: {
        workflowInputValues: {
          dir: "/tmp/input",
          outputPath: "/tmp/out.txt",
        },
      },
      root: {
        ...uiDocument("fs_workflow").root,
        children: [{ id: "list_input_dir", kind: "callBlock" }],
      },
    };
    const serverUI = {
      ...uiDocument("fs_workflow"),
      root: {
        ...uiDocument("fs_workflow").root,
        children: [
          { id: "if_node", kind: "if" },
          { id: "list_input_dir", kind: "callBlock" },
        ],
      },
    };

    const normalized = normalizeWorkflowDraftForServerUI(
      {
        pendingOperations: [],
        selectedNodeId: "root",
        source,
        ui: staleDraftUI,
      },
      serverUI,
    );

    expect(normalized.ui.root.children?.map((child) => child.id)).toEqual(["if_node", "list_input_dir"]);
    expect(normalized.ui.metadata?.workflowInputValues).toEqual({
      dir: "/tmp/input",
      outputPath: "/tmp/out.txt",
    });
  });
});

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() {
    return this.values.size;
  }
  clear() {
    this.values.clear();
  }
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

function uiDocument(workflowId: string): UIDocument {
  return {
    schemaVersion: "1.0.0",
    workflowId,
    root: {
      id: "root",
      kind: "sequence",
    },
  };
}

function editOperation(operationId: string): EditOperation {
  return {
    operationId,
    path: "$.inputs.dir",
    payload: { value: { kind: "literal", value: "/tmp" } },
    schemaVersion: "1.0.0",
    targetNodeId: "root",
    type: "updateField",
  };
}
