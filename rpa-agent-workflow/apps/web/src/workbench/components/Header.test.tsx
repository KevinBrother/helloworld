import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Header } from "./Header";

describe("Header", () => {
  it("keeps the manual run action clickable when the server workflow cannot run", () => {
    const html = renderToStaticMarkup(
      <Header
        runPending={false}
        status="当前工作流未同步到服务端，不能运行。"
        workflowName="Sample Workflow"
        onSave={() => undefined}
        onRun={() => undefined}
      />,
    );

    expect(html).toContain("运行");
    expect(html).not.toContain("测试");
    expect(html).not.toContain("打开工作流");
    expect(html).not.toContain("加载 UI JSON");
    expect(html).not.toContain("disabled=\"\"");
  });

  it("keeps the run action clickable while a run is pending", () => {
    const html = renderToStaticMarkup(
      <Header
        runPending={true}
        status="运行中"
        workflowName="Filesystem Workflow"
        onSave={() => undefined}
        onRun={() => undefined}
      />,
    );

    expect(html).toContain("运行中");
    expect(html).not.toContain("测试");
    expect(html).not.toContain("disabled=\"\"");
  });

  it("keeps save clickable so missing prerequisites are reported by the click handler", () => {
    const html = renderToStaticMarkup(
      <Header
        runPending={false}
        status="流程服务未连接"
        workflowName="Filesystem Workflow"
        onSave={() => undefined}
        onRun={() => undefined}
      />,
    );

    expect(html).toContain("保存流程");
    expect(html).not.toContain("disabled=\"\"");
  });
});
