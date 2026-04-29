import { normalizeQuery } from "./normalize-query";
import type { A2uiAnswerPayload } from "./types";

export function generateA2uiPayload(input: string): A2uiAnswerPayload {
  const normalized = normalizeQuery(input);
  const topic =
    normalized.includes("agui") || normalized.includes("a2ui")
      ? "a2ui + AGUI + CopilotKit"
      : "agent ui basics";

  return {
    topic,
    agent: "agui-learning-agent",
    followUp: "Ask how V2 works without CopilotKit.",
    cards: [
      {
        id: "card-a2ui",
        question: "What is a2ui?",
        answer:
          "a2ui means the agent produces structured UI-ready content instead of only plain text.",
        tags: ["a2ui", "rendering"],
        protocol: "a2ui",
      },
      {
        id: "card-agui",
        question: "What is AGUI?",
        answer:
          "AGUI is the protocol boundary carrying structured agent messages between service and UI.",
        tags: ["AGUI", "protocol"],
        protocol: "a2ui",
      },
      {
        id: "card-copilotkit",
        question: "Where does CopilotKit fit?",
        answer:
          "CopilotKit bridges chat orchestration and the frontend experience while the backend generates the structured payload.",
        tags: ["CopilotKit", "orchestration"],
        protocol: "a2ui",
      },
    ],
  };
}
