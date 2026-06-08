import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { WorkbenchModel, WorkbenchNode } from "../../workbenchModel";
import { RunModal } from "./RunModal";

describe("RunModal", () => {
  it("keeps the run action clickable so validation can report the exact blocker", () => {
    const html = renderToStaticMarkup(
      <RunModal
        errors={{ dir: "必填" }}
        model={model}
        pending={false}
        runMessage="当前工作流未同步到服务端，不能运行。"
        workflowInputNode={workflowInputNode}
        openSourceKey={null}
        onClose={() => undefined}
        onFieldChange={() => undefined}
        onOpenSourceKeyChange={() => undefined}
        onRun={() => undefined}
      />,
    );

    expect(html).toContain("运行");
    expect(html).toContain("请先修正流程输入");
    expect(html).not.toContain("当前工作流未同步到服务端，不能运行。");
    expect(html).not.toContain("测试");
    expect(html).not.toContain("disabled=\"\"");
  });

  it("keeps the run action clickable while a run is pending", () => {
    const html = renderToStaticMarkup(
      <RunModal
        errors={{}}
        model={model}
        pending={true}
        runMessage="在服务端运行当前流程。"
        workflowInputNode={workflowInputNode}
        openSourceKey={null}
        onClose={() => undefined}
        onFieldChange={() => undefined}
        onOpenSourceKeyChange={() => undefined}
        onRun={() => undefined}
      />,
    );

    expect(html).toContain("运行中");
    expect(html).not.toContain("测试");
    expect(html).not.toContain("disabled=\"\"");
  });
});

const workflowInputNode: WorkbenchNode = {
  id: "root",
  kind: "sequence",
  label: "开始",
  order: 0,
  raw: { id: "root", kind: "sequence" },
  inputs: [
    {
      key: "dir",
      label: "dir",
      type: "path",
      control: "input",
      path: "$.inputs.dir",
      value: { kind: "literal", value: "" },
    },
  ],
  outputs: [],
  inputPorts: [{ key: "dir", label: "dir", type: "path", path: "$.inputs.dir", value: { name: "dir", type: { name: "path" } } }],
  outputPorts: [],
};

const model: WorkbenchModel = {
  workflowId: "fs_workflow",
  workflowName: "Filesystem Workflow",
  root: workflowInputNode.raw,
  nodes: [workflowInputNode],
  sources: [],
  sourcesById: new Map(),
  blockOptions: [],
};
