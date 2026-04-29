"use client";

import { HttpAgent } from "@ag-ui/client";
import { useState } from "react";
import { A2uiCardList } from "@/components/a2ui-card-list";
import { extractPayloadFromMessages } from "@/lib/a2ui/parse-payload";
import type { A2uiAnswerPayload } from "@/lib/a2ui/types";

export function ManualAgentForm() {
  const [query, setQuery] = useState(
    "Explain a2ui, AGUI, and CopilotKit together.",
  );
  const [payload, setPayload] = useState<A2uiAnswerPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit() {
    setIsLoading(true);
    setError(null);

    try {
      const agent = new HttpAgent({
        url: "/api/agui",
        initialMessages: [
          {
            id: crypto.randomUUID(),
            role: "user",
            content: query,
          },
        ],
      });
      const result = await agent.runAgent();
      const nextPayload = extractPayloadFromMessages(result.newMessages);

      if (!nextPayload) {
        setError("The AGUI service did not return a structured a2ui payload.");
        setPayload(null);
        return;
      }

      setPayload(nextPayload);
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Manual AGUI call failed.",
      );
      setPayload(null);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <label
          htmlFor="manual-query"
          className="text-sm font-medium text-slate-700"
        >
          Ask the AGUI endpoint directly
        </label>
        <textarea
          id="manual-query"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="min-h-32 w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-900 shadow-sm outline-none"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isLoading}
          className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {isLoading ? "Running..." : "Run manual AGUI request"}
        </button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {payload ? (
        <A2uiCardList
          payload={payload}
          title="Rendered from the manual AGUI flow"
        />
      ) : null}
    </div>
  );
}
