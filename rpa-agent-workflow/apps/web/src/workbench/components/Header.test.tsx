import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Header } from "./Header";

describe("Header", () => {
  it("keeps the test run action clickable when the server workflow cannot run", () => {
    const html = renderToStaticMarkup(
      <Header
        runPending={false}
        serverAvailable={true}
        status="当前工作流未同步到服务端，不能测试运行。"
        workflowName="Sample Workflow"
        onOpenWorkflow={() => undefined}
        onRun={() => undefined}
      />,
    );

    expect(html).toContain("打开工作流");
    expect(html).toContain("测试运行");
    expect(html).not.toContain("加载 UI JSON");
    expect(html).not.toContain("disabled=\"\"");
  });

  it("keeps the test run action clickable while a run is pending", () => {
    const html = renderToStaticMarkup(
      <Header
        runPending={true}
        serverAvailable={true}
        status="测试运行中"
        workflowName="Filesystem Workflow"
        onOpenWorkflow={() => undefined}
        onRun={() => undefined}
      />,
    );

    expect(html).toContain("运行中");
    expect(html).not.toContain("disabled=\"\"");
  });
});
