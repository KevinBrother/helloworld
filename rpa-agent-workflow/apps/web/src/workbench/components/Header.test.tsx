import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Header } from "./Header";

describe("Header", () => {
  it("keeps the test run action clickable when the server workflow cannot run", () => {
    const html = renderToStaticMarkup(
      <Header
        runPending={false}
        serverAvailable={true}
        status="当前 UI JSON 未同步到服务端 AST，不能测试运行。"
        workflowName="Sample Workflow"
        onLoadJSON={() => undefined}
        onRun={() => undefined}
      />,
    );

    expect(html).toContain("测试运行");
    expect(html).not.toContain("disabled=\"\"");
  });

  it("keeps the test run action clickable while a run is pending", () => {
    const html = renderToStaticMarkup(
      <Header
        runPending={true}
        serverAvailable={true}
        status="测试运行中"
        workflowName="Filesystem Workflow"
        onLoadJSON={() => undefined}
        onRun={() => undefined}
      />,
    );

    expect(html).toContain("运行中");
    expect(html).not.toContain("disabled=\"\"");
  });
});
