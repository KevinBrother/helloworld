import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { WorkbenchModel, WorkbenchNode } from "../../workbenchModel";
import { ParameterPanel } from "./ParameterPanel";

describe("ParameterPanel", () => {
  it("renders workflow start inputs as one unified input parameter card", () => {
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

    expect(html).toContain("输入参数");
    expect(html).not.toContain("运行输入值");
    expect(html).toContain("aria-label=\"参数名 dir\"");
    expect(html).toContain("aria-label=\"参数类型 dir\"");
    expect(html).toContain("aria-label=\"dir value\"");
    expect(html).toContain("添加自定义参数");
  });

  it("renders return outputs as one unified output parameter card", () => {
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

    expect(html).toContain("输出参数");
    expect(html).not.toContain("流程输出");
    expect(html).not.toContain("返回值");
    expect(html).toContain("aria-label=\"参数名 result\"");
    expect(html).toContain("aria-label=\"参数类型 result\"");
    expect(html).toContain("aria-label=\"result value\"");
    expect(html).toContain("aria-label=\"引用 result\"");
    expect(html).toContain("{{node.branch_by_threshold.result}}");
    expect(html).toContain("添加自定义输出");
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
  inputRows: [
    {
      id: "input:$.inputs.dir",
      direction: "input",
      name: "dir",
      type: "string",
      nameEditable: true,
      typeEditable: true,
      valueEditable: true,
      custom: true,
      value: "input-dir",
      valuePath: "$.inputs.dir",
      portPath: "$.inputs.dir",
      field: { key: "dir", label: "dir", type: "string", control: "input", path: "$.inputs.dir", value: "input-dir" },
      port: { key: "dir", label: "dir", type: "string", path: "$.inputs.dir", value: { name: "dir", type: { name: "string" } } },
      allowReference: false,
      allowDelete: true,
    },
  ],
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
  outputRows: [
    {
      id: "output:$.body.statements[0].outputs.result",
      direction: "output",
      name: "result",
      type: "number",
      nameEditable: false,
      typeEditable: false,
      valueEditable: false,
      custom: false,
      valuePath: "$.body.statements[0].outputs.result",
      field: { key: "result", label: "result", type: "number", control: "readonly", path: "$.body.statements[0].outputs.result", value: undefined, readonly: true },
      allowReference: false,
      allowDelete: false,
    },
  ],
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
  outputRows: [
    {
      id: "output:$.outputs.result",
      direction: "output",
      name: "result",
      type: "number",
      nameEditable: true,
      typeEditable: true,
      valueEditable: true,
      custom: true,
      value: { kind: "ref", ref: "node.branch_by_threshold.result" },
      valuePath: "$.body.statements[0].returns.result",
      portPath: "$.outputs.result",
      field: {
        key: "result",
        label: "result",
        type: "number",
        control: "reference",
        path: "$.body.statements[0].returns.result",
        value: { kind: "ref", ref: "node.branch_by_threshold.result" },
      },
      port: { key: "result", label: "result", type: "number", path: "$.outputs.result", value: { name: "result", type: { name: "number" } } },
      allowReference: true,
      allowDelete: true,
    },
  ],
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
