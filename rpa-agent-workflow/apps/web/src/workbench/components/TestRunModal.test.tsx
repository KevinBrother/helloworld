import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { WorkbenchModel, WorkbenchNode } from "../../workbenchModel";
import { TestRunModal } from "./TestRunModal";

describe("TestRunModal", () => {
  it("keeps the run action clickable so validation can report the exact blocker", () => {
    const html = renderToStaticMarkup(
      <TestRunModal
        errors={{ dir: "必填" }}
        model={model}
        pending={false}
        runMessage="当前 UI JSON 未同步到服务端 AST，不能测试运行。"
        workflowInputNode={workflowInputNode}
        openSourceKey={null}
        onClose={() => undefined}
        onFieldChange={() => undefined}
        onOpenSourceKeyChange={() => undefined}
        onRun={() => undefined}
      />,
    );

    expect(html).toContain("运行测试");
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
