import type { A2uiAnswerPayload } from "./types";

export function parseA2uiPayload(raw: string): A2uiAnswerPayload | null {
  try {
    const parsed = JSON.parse(raw) as A2uiAnswerPayload;
    if (
      !parsed ||
      !Array.isArray(parsed.cards) ||
      typeof parsed.followUp !== "string" ||
      typeof parsed.topic !== "string" ||
      parsed.agent !== "agui-learning-agent"
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function extractPayloadFromMessages(
  messages: Array<{ role: string; content?: unknown }>,
) {
  const lastAssistantMessage = [...messages]
    .reverse()
    .find((message) => message.role === "assistant");

  const rawContent =
    typeof lastAssistantMessage?.content === "string"
      ? lastAssistantMessage.content
      : null;

  if (!rawContent) {
    return null;
  }

  return parseA2uiPayload(rawContent);
}
