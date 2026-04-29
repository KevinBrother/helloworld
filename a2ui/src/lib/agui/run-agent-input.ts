export type RunAgentMessage = {
  id?: string;
  role: "user" | "assistant" | "system" | "developer";
  content?: string;
};

export type RunAgentInput = {
  threadId?: string;
  runId?: string;
  messages: RunAgentMessage[];
};

export function getLastUserMessage(input: RunAgentInput) {
  return [...input.messages].reverse().find((message) => message.role === "user");
}
