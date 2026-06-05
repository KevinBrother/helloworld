import { describe, expect, it } from "vitest";
import { workflowSourceFromSearch } from "./workflowSource";

describe("workflowSourceFromSearch", () => {
  it("uses the absolute ast.json path from the workflow query parameter", () => {
    expect(
      workflowSourceFromSearch(
        "?workflow=%2FVolumes%2Fdoc%2Fworkspace%2Fproject%2Fhelloworld%2Frpa-agent-workflow%2Fexamples%2Ffs-workflow%2Fast.json",
      ),
    ).toEqual({
      source: "/Volumes/doc/workspace/project/helloworld/rpa-agent-workflow/examples/fs-workflow/ast.json",
    });
  });

  it("rejects relative workflow paths instead of resolving them in the browser", () => {
    expect(workflowSourceFromSearch("?workflow=examples/fs-workflow/ast.json")).toEqual({
      error: "workflow 参数必须是 ast.json 的绝对路径。",
    });
  });

  it("rejects absolute json files that are not ast.json", () => {
    expect(workflowSourceFromSearch("?workflow=/Volumes/doc/workspace/project/helloworld/rpa-agent-workflow/output/ui-node.json")).toEqual({
      error: "workflow 参数必须是 ast.json 的绝对路径。",
    });
  });
});
