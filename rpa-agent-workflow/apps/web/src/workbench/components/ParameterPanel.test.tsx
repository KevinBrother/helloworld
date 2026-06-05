import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { WorkbenchModel, WorkbenchNode } from "../../workbenchModel";
import { ParameterPanel } from "./ParameterPanel";

describe("ParameterPanel", () => {
  it("renders editable workflow input port declarations on the start node", () => {
    const html = renderToStaticMarkup(
      <ParameterPanel
        model={model}
        node={startNode}
        openSourceKey={null}
        onFieldChange={() => undefined}
        onOpenSourceKeyChange={() => undefined}
        onWorkflowPortsChange={() => undefined}
      />,
    );

    expect(html).toContain("流程输入");
    expect(html).toContain("添加输入");
    expect(html).toContain("aria-label=\"参数名 1\"");
    expect(html).toContain("aria-label=\"参数类型 1\"");
    expect(html).not.toContain("readonly-value");
  });

  it("keeps workflow run input values editable on the start node", () => {
    const html = renderToStaticMarkup(
      <ParameterPanel
        model={model}
        node={startNode}
        openSourceKey={null}
        onFieldChange={() => undefined}
        onOpenSourceKeyChange={() => undefined}
        onWorkflowPortsChange={() => undefined}
      />,
    );

    expect(html).toContain("运行输入值");
    expect(html).toContain("aria-label=\"dir value\"");
  });

  it("renders editable workflow output port declarations on the return node", () => {
    const html = renderToStaticMarkup(
      <ParameterPanel
        model={{ ...model, nodes: [returnNode] }}
        node={returnNode}
        openSourceKey={null}
        onFieldChange={() => undefined}
        onOpenSourceKeyChange={() => undefined}
        onWorkflowPortsChange={() => undefined}
      />,
    );

    expect(html).toContain("流程输出");
    expect(html).toContain("添加输出");
    expect(html).toContain("aria-label=\"参数名 1\"");
    expect(html).toContain("aria-label=\"删除参数 result\"");
  });

  it("keeps return value expressions editable on the return node", () => {
    const html = renderToStaticMarkup(
      <ParameterPanel
        model={{ ...model, nodes: [branchNode, returnNode] }}
        node={returnNode}
        openSourceKey={null}
        onFieldChange={() => undefined}
        onOpenSourceKeyChange={() => undefined}
        onWorkflowPortsChange={() => undefined}
      />,
    );

    expect(html).toContain("返回值");
    expect(html).toContain("aria-label=\"result value\"");
    expect(html).toContain("aria-label=\"引用 result\"");
    expect(html).toContain("{{node.branch_by_threshold.result}}");
  });
});

const startNode: WorkbenchNode = {
  id: "root",
  kind: "sequence",
  label: "Start",
  order: 0,
  raw: { id: "root", kind: "sequence" },
  inputs: [{ key: "dir", label: "dir", type: "string", control: "input", path: "$.inputs.dir", value: "input-dir" }],
  outputs: [{ key: "result", label: "result", type: "number", control: "input", path: "$.body.statements[0].returns.result", value: { kind: "literal", value: 0 } }],
  inputPorts: [{ key: "dir", label: "dir", type: "string", path: "$.inputs.dir", value: { name: "dir", type: { name: "string" } } }],
  outputPorts: [],
  inputRows: [],
  outputRows: [],
  allowCustomInput: true,
  allowCustomOutput: false,
  deletable: false,
  deleteMessage: "",
  hasNestedChildren: false,
};

const branchNode: WorkbenchNode = {
  id: "branch_by_threshold",
  kind: "if",
  label: "Branch By Threshold",
  order: 1,
  raw: { id: "branch_by_threshold", kind: "if" },
  inputs: [],
  outputs: [{ key: "result", label: "result", type: "number", control: "readonly", path: "$.body.statements[0].outputs.result", value: undefined, readonly: true }],
  inputPorts: [],
  outputPorts: [],
  inputRows: [],
  outputRows: [],
  allowCustomInput: false,
  allowCustomOutput: false,
  deletable: true,
  deleteMessage: "",
  hasNestedChildren: false,
};

const returnNode: WorkbenchNode = {
  id: "return_result",
  kind: "return",
  label: "Return",
  order: 2,
  raw: { id: "return_result", kind: "return" },
  inputs: [],
  outputs: [
    {
      key: "result",
      label: "result",
      type: "number",
      control: "reference",
      path: "$.body.statements[0].returns.result",
      value: { kind: "ref", ref: "node.branch_by_threshold.result" },
    },
  ],
  inputPorts: [],
  outputPorts: [{ key: "result", label: "result", type: "number", path: "$.outputs.result", value: { name: "result", type: { name: "number" } } }],
  inputRows: [],
  outputRows: [],
  allowCustomInput: false,
  allowCustomOutput: true,
  deletable: false,
  deleteMessage: "",
  hasNestedChildren: false,
};

const model: WorkbenchModel = {
  workflowId: "wf",
  workflowName: "Workflow",
  root: startNode.raw,
  nodes: [startNode, branchNode, returnNode],
  sources: [],
  sourcesById: new Map(),
  blockOptions: [],
};
