import { describe, expect, it } from "vitest";
import fsWorkflowAst from "../../../examples/fs-workflow/ast.json";
import sampleDocument from "../../../output/calculator-ui-node.json";
import { parseUIDocumentJSON } from "./workflowJson";

describe("workflow json loading", () => {
  it("accepts projected UI node json", () => {
    expect(parseUIDocumentJSON(JSON.stringify(sampleDocument)).root.id).toBe("root");
  });

  it("rejects AST json instead of treating it as UI node json", () => {
    expect(() => parseUIDocumentJSON(JSON.stringify(fsWorkflowAst))).toThrow("请选择 UI Node JSON");
  });
});
