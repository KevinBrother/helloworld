import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { UIDocument } from "../../types";
import { buildWorkbenchModel } from "../../workbenchModel";
import { calculateCanvasStage, calculateZoomScrollPosition, WorkflowCanvas } from "./WorkflowCanvas";

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
    expect(html).not.toContain("canvas-join-node");
    expect(html).toContain('d="M650 518 L650 656 L490 656"');
  });

  it("renders if nodes as diamond decisions with branch counts", () => {
    const model = buildWorkbenchModel(branchCanvasDocument);

    const html = renderToStaticMarkup(
      <WorkflowCanvas model={model} nodeRunStates={{}} selectedId="root" onSelect={() => undefined} onInsertAtEdge={() => undefined} />,
    );

    expect(html).toContain("canvas-node-if");
    expect(html).toContain("if 决策");
    expect(html).toContain("2 个分支条件");
    expect(html).not.toContain("if Choose Path 0 个输入 0 个输出");
  });

  it("renders the diagram in a scalable stage with scroll buffer space", () => {
    const model = buildWorkbenchModel(branchCanvasDocument);

    const html = renderToStaticMarkup(
      <WorkflowCanvas model={model} nodeRunStates={{}} selectedId="root" onSelect={() => undefined} onInsertAtEdge={() => undefined} />,
    );

    expect(html).toContain("workflow-stage");
    expect(html).toContain("workflow-zoom-shell");
    expect(html).toContain("--canvas-buffer");
    expect(html).toContain("--canvas-scale");
  });

  it("renders manual zoom controls", () => {
    const model = buildWorkbenchModel(branchCanvasDocument);

    const html = renderToStaticMarkup(
      <WorkflowCanvas model={model} nodeRunStates={{}} selectedId="root" onSelect={() => undefined} onInsertAtEdge={() => undefined} />,
    );

    expect(html).toContain("缩小画布");
    expect(html).toContain("放大画布");
    expect(html).toContain("适配全量画布");
    expect(html).toContain("滚轮平移已开启");
    expect(html).toContain("100%");
  });

  it("uses manual scale when one is provided", () => {
    const stage = calculateCanvasStage(2000, 1200, 900, 600, 0.75);

    expect(stage.scale).toBe(0.75);
    expect(stage.scaledWidth).toBe(1500);
    expect(stage.scaledHeight).toBe(900);
  });

  it("keeps the pointer position stable while zooming with wheel gestures", () => {
    const previousStage = calculateCanvasStage(2000, 1200, 900, 600, 0.5);
    const nextStage = calculateCanvasStage(2000, 1200, 900, 600, 0.8);

    const scroll = calculateZoomScrollPosition({
      clientHeight: 600,
      clientWidth: 900,
      pointerClientX: 450,
      pointerClientY: 300,
      scrollLeft: 100,
      scrollTop: 120,
      previousStage,
      nextStage,
    });

    expect(scroll.left).toBe(338);
    expect(scroll.top).toBe(274);
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
