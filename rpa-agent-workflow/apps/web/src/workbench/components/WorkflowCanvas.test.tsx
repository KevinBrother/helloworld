import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { UIDocument } from "../../types";
import { buildWorkbenchModel } from "../../workbenchModel";
import { WorkflowCanvas } from "./WorkflowCanvas";

describe("WorkflowCanvas", () => {
  it("renders branch controls without labeling visual joins", () => {
    const model = buildWorkbenchModel(branchCanvasDocument);

    const html = renderToStaticMarkup(
      <WorkflowCanvas model={model} nodeRunStates={{}} selectedId="root" onSelect={() => undefined} onInsertAtEdge={() => undefined} />,
    );

    expect(html).toContain("新增条件分支");
    expect(html).toContain("分支开头插入");
    expect(html).toContain("分支末尾追加");
    expect(html).toContain("继续追加");
    expect(html).not.toContain("汇合");
  });
});

const branchCanvasDocument: UIDocument = {
  schemaVersion: "1.0.0",
  workflowId: "branch_canvas",
  root: {
    id: "root",
    kind: "sequence",
    label: "Start",
    children: [
      {
        id: "choose_path",
        kind: "if",
        label: "Choose Path",
        branches: [
          { id: "condition_1", label: "条件 1", kind: "condition", children: [{ id: "condition_step", kind: "callBlock", label: "Condition Step" }] },
          { id: "else", label: "否则", kind: "default", children: [] },
        ],
      },
      { id: "return_result", kind: "return", label: "Return" },
    ],
  },
};
