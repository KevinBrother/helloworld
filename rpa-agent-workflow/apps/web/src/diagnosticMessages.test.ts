import { describe, expect, it } from "vitest";
import { formatDiagnosticMessage, formatDiagnostics } from "./diagnosticMessages";

describe("diagnostic message formatting", () => {
  it("localizes compiler number type mismatch diagnostics", () => {
    expect(
      formatDiagnosticMessage({
        severity: "error",
        code: "TYPE_MISMATCH",
        message: "expected number",
        path: "$.body.statements[0].inputs.durationMs",
      }),
    ).toBe("字段类型不匹配：需要数字（$.body.statements[0].inputs.durationMs）");
  });

  it("formats diagnostic arrays without mutating the original diagnostics", () => {
    const diagnostics = [{ severity: "error", code: "TYPE_MISMATCH", message: "expected number", path: "$.inputs.left" }];

    expect(formatDiagnostics(diagnostics)).toEqual([
      { severity: "error", code: "TYPE_MISMATCH", message: "字段类型不匹配：需要数字（$.inputs.left）", path: "$.inputs.left" },
    ]);
    expect(diagnostics[0].message).toBe("expected number");
  });
});
