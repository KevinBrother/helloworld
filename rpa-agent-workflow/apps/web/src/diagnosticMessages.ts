import type { Diagnostic } from "./types";

const TYPE_LABELS: Record<string, string> = {
  array: "数组",
  boolean: "布尔值",
  number: "数字",
  object: "对象",
  string: "文本",
};

export function formatDiagnostics(diagnostics: Diagnostic[]) {
  return diagnostics.map((diagnostic) => ({
    ...diagnostic,
    message: formatDiagnosticMessage(diagnostic),
  }));
}

export function formatDiagnosticMessage(diagnostic: Diagnostic) {
  if (diagnostic.code === "TYPE_MISMATCH") {
    const expectedType = expectedTypeFromMessage(diagnostic.message);
    const location = diagnostic.path ? `（${diagnostic.path}）` : "";
    return `字段类型不匹配：需要${formatTypeLabel(expectedType)}${location}`;
  }

  return diagnostic.message ?? diagnostic.code ?? "流程校验失败";
}

function expectedTypeFromMessage(message: string | undefined) {
  const match = message?.match(/^expected\s+([a-zA-Z_][\w-]*)$/);
  return match?.[1] ?? "";
}

function formatTypeLabel(type: string) {
  return TYPE_LABELS[type] ?? (type || "正确类型");
}
