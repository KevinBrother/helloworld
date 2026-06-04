import { describe, expect, it } from "vitest";
import { reduceRunMessage, type NodeRunStateMap } from "./runEvents";

describe("run event state reducer", () => {
  it("marks nodes running and completed from server trace events", () => {
    let states: NodeRunStateMap = {};

    states = reduceRunMessage(states, {
      type: "trace",
      event: { name: "statement.start", workflowId: "calculator", statementId: "calculate_large_value", statementKind: "callBlock" },
    });
    expect(states.calculate_large_value).toBe("running");

    states = reduceRunMessage(states, {
      type: "trace",
      event: { name: "statement.end", workflowId: "calculator", statementId: "calculate_large_value", statementKind: "callBlock" },
    });
    expect(states.calculate_large_value).toBe("completed");
  });

  it("marks the server-reported failed node", () => {
    const states = reduceRunMessage(
      { calculate_large_value: "running" },
      {
        type: "error",
        event: { name: "run.error", workflowId: "calculator", statementId: "calculate_large_value", statementKind: "callBlock" },
        diagnostics: [{ severity: "error", code: "RUN_FAILED", message: "host failed" }],
      },
    );

    expect(states.calculate_large_value).toBe("failed");
  });

  it("closes any still-running node when the server result arrives", () => {
    const states = reduceRunMessage(
      { root: "running", calculate_large_value: "completed" },
      {
        type: "result",
        result: { returns: { result: 22 } },
      },
    );

    expect(states).toEqual({ root: "completed", calculate_large_value: "completed" });
  });
});
