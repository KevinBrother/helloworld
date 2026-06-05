import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Header } from "./Header";

describe("Header", () => {
  it("disables the test run action when the server workflow cannot run", () => {
    const html = renderToStaticMarkup(
      <Header
        runAvailable={false}
        runPending={false}
        serverAvailable={true}
        status="当前 UI JSON 未同步到服务端 AST，不能测试运行。"
        workflowName="Sample Workflow"
        onLoadJSON={() => undefined}
        onRun={() => undefined}
      />,
    );

    expect(html).toContain("测试运行");
    expect(html).toContain("disabled=\"\"");
  });
});
