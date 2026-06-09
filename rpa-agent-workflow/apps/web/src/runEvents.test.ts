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

  it("keeps only the active serial statement running while the root sequence is open", () => {
    let states: NodeRunStateMap = {};

    states = reduceRunMessage(states, {
      type: "trace",
      event: { name: "statement.start", workflowId: "calculator", statementId: "root", statementKind: "sequence" },
    });
    states = reduceRunMessage(states, {
      type: "trace",
      event: { name: "statement.start", workflowId: "calculator", statementId: "first_delay", statementKind: "callBlock" },
    });
    states = reduceRunMessage(states, {
      type: "trace",
      event: { name: "statement.end", workflowId: "calculator", statementId: "first_delay", statementKind: "callBlock" },
    });
    states = reduceRunMessage(states, {
      type: "trace",
      event: { name: "statement.start", workflowId: "calculator", statementId: "second_log", statementKind: "callBlock" },
    });

    expect(states.root).not.toBe("running");
    expect(states.first_delay).toBe("completed");
    expect(states.second_log).toBe("running");
    expect(Object.values(states).filter((state) => state === "running")).toHaveLength(1);
  });

  it("keeps parallel containers running with their active child statements", () => {
    let states: NodeRunStateMap = {};

    states = reduceRunMessage(states, {
      type: "trace",
      event: { name: "statement.start", workflowId: "parallel_workflow", statementId: "run_both", statementKind: "parallel" },
    });
    states = reduceRunMessage(states, {
      type: "trace",
      event: { name: "statement.start", workflowId: "parallel_workflow", statementId: "left_delay", statementKind: "callBlock" },
    });

    expect(states.run_both).toBe("running");
    expect(states.left_delay).toBe("running");
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
