import type { Diagnostic, RunResponse, RunStreamMessage } from "./types";

export type NodeRunState = "idle" | "running" | "completed" | "failed";
export type NodeRunStateMap = Record<string, NodeRunState>;

export type RunStreamOutcome =
  | { ok: true; response: RunResponse }
  | { ok: false; diagnostics: Diagnostic[] };

export function reduceRunMessage(states: NodeRunStateMap, message: RunStreamMessage): NodeRunStateMap {
  if (message.type === "result") {
    return completeRunningStates(states);
  }

  const event = message.event;
  const statementId = event?.statementId;
  if (!statementId) {
    return states;
  }

  if (message.type === "error" || event?.name === "run.error") {
    return { ...states, [statementId]: "failed" };
  }

  if (event?.name === "statement.start") {
    if (isPassiveContainerStatement(event.statementKind)) {
      return states;
    }
    return { ...states, [statementId]: "running" };
  }

  if (event?.name === "statement.end") {
    return { ...states, [statementId]: states[statementId] === "failed" ? "failed" : "completed" };
  }

  return states;
}

function completeRunningStates(states: NodeRunStateMap): NodeRunStateMap {
  return Object.fromEntries(Object.entries(states).map(([nodeId, state]) => [nodeId, state === "running" ? "completed" : state]));
}

function isPassiveContainerStatement(statementKind?: string) {
  return statementKind === "sequence";
}

export function runWorkflowStream(inputs: Record<string, unknown>, onMessage: (message: RunStreamMessage) => void): Promise<RunStreamOutcome> {
  return new Promise((resolve) => {
    const params = new URLSearchParams();
    if (Object.keys(inputs).length > 0) {
      params.set("inputs", JSON.stringify(inputs));
    }
    const source = new EventSource(`/api/run/stream${params.size > 0 ? `?${params}` : ""}`);

    source.onmessage = (event) => {
      const message = parseRunStreamMessage(event.data);
      if (!message) return;

      onMessage(message);
      if (message.type === "result") {
        source.close();
        resolve({ ok: true, response: { result: message.result, diagnostics: message.diagnostics } });
      }
      if (message.type === "error") {
        source.close();
        resolve({ ok: false, diagnostics: message.diagnostics ?? [] });
      }
    };

    source.onerror = () => {
      source.close();
      resolve({
        ok: false,
        diagnostics: [{ severity: "error", code: "workflow.stream", message: "Workflow run stream disconnected" }],
      });
    };
  });
}

function parseRunStreamMessage(data: string): RunStreamMessage | null {
  try {
    const parsed = JSON.parse(data) as RunStreamMessage;
    if (parsed.type === "trace" || parsed.type === "result" || parsed.type === "error") {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}
