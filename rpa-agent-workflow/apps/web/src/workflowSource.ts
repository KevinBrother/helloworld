const WORKFLOW_SOURCE_ERROR = "workflow 参数必须是 ast.json 的绝对路径。";

export type WorkflowSourceResult = { source: string } | { source: null } | { error: string };

export function workflowSourceFromSearch(search: string): WorkflowSourceResult {
  const source = new URLSearchParams(search).get("workflow")?.trim() ?? "";
  if (!source) return { source: null };
  if (!source.startsWith("/") || source.split("/").at(-1) !== "ast.json") {
    return { error: WORKFLOW_SOURCE_ERROR };
  }
  return { source };
}
