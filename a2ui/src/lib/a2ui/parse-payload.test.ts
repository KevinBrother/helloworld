import { describe, expect, it } from "vitest";
import { extractPayloadFromMessages } from "./parse-payload";

const payload = {
  topic: "a2ui + AGUI + CopilotKit",
  agent: "agui-learning-agent" as const,
  followUp: "Ask how V2 works without CopilotKit.",
  cards: [
    {
      id: "card-a2ui",
      question: "What is a2ui?",
      answer: "UI-ready content",
      tags: ["a2ui"],
      protocol: "a2ui" as const,
    },
  ],
};

describe("extractPayloadFromMessages", () => {
  it("returns the last assistant payload from AGUI messages", () => {
    const result = extractPayloadFromMessages([
      { id: "1", role: "user", content: "Explain a2ui" },
      { id: "2", role: "assistant", content: JSON.stringify(payload) },
    ]);

    expect(result).toEqual(payload);
  });

  it("returns null when assistant content is not structured JSON", () => {
    const result = extractPayloadFromMessages([
      { id: "1", role: "assistant", content: "plain text" },
    ]);

    expect(result).toBeNull();
  });
});
