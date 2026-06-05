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
});

const startNode: WorkbenchNode = {
  id: "root",
  kind: "sequence",
  label: "Start",
  order: 0,
  raw: { id: "root", kind: "sequence" },
  inputs: [],
  outputs: [],
  inputPorts: [{ key: "dir", label: "dir", type: "string", path: "$.inputs.dir", value: { name: "dir", type: { name: "string" } } }],
  outputPorts: [],
  deletable: false,
  deleteMessage: "",
  hasNestedChildren: false,
};

const returnNode: WorkbenchNode = {
  id: "return_result",
  kind: "return",
  label: "Return",
  order: 1,
  raw: { id: "return_result", kind: "return" },
  inputs: [],
  outputs: [],
  inputPorts: [],
  outputPorts: [{ key: "result", label: "result", type: "number", path: "$.outputs.result", value: { name: "result", type: { name: "number" } } }],
  deletable: false,
  deleteMessage: "",
  hasNestedChildren: false,
};

const model: WorkbenchModel = {
  workflowId: "wf",
  workflowName: "Workflow",
  root: startNode.raw,
  nodes: [startNode, returnNode],
  sources: [],
  sourcesById: new Map(),
  blockOptions: [],
};
