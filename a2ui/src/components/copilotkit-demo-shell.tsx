"use client";

import {
  CopilotChat,
  CopilotChatAssistantMessage,
  CopilotKit,
  useAgentContext,
  useConfigureSuggestions,
} from "@copilotkit/react-core/v2";
import { CopilotkitA2uiAssistantMessage } from "./copilotkit-a2ui-assistant-message";

const AGENT_ID = "a2ui-fixed-schema";

const A2UI_INSTRUCTIONS = `
You are a learning assistant for a2ui, AGUI, and CopilotKit.

When the user asks a question, answer with exactly one JSON object and nothing else.
The JSON must match this shape:
{
  "topic": string,
  "agent": "agui-learning-agent",
  "followUp": string,
  "cards": [
    {
      "id": string,
      "question": string,
      "answer": string,
      "tags": string[],
      "protocol": "a2ui"
    }
  ]
}
`.trim();

const SUGGESTIONS = [
  "Explain a2ui, AGUI, and CopilotKit together.",
  "How does CopilotKit consume AGUI data?",
  "Why does a2ui help frontend rendering?",
];

export function CopilotkitDemoShell() {
  return (
    <CopilotKit runtimeUrl="/api/copilotkit-a2ui-fixed-schema" agent={AGENT_ID}>
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <ConfiguredCopilotChat />
      </div>
    </CopilotKit>
  );
}

function ConfiguredCopilotChat() {
  useAgentContext({
    description: "a2ui fixed schema instructions",
    value: A2UI_INSTRUCTIONS,
  });

  useConfigureSuggestions({
    suggestions: SUGGESTIONS.map((message) => ({
      title: message,
      message,
    })),
    available: "always",
  });

  const messageView = {
    assistantMessage:
      CopilotkitA2uiAssistantMessage as unknown as typeof CopilotChatAssistantMessage,
  };

  return (
    <CopilotChat
      agentId={AGENT_ID}
      className="h-[700px]"
      labels={{
        modalHeaderTitle: "a2ui / AGUI / CopilotKit",
        welcomeMessageText:
          "Ask a question and I will return structured a2ui cards.",
        chatInputPlaceholder: "Explain a2ui, AGUI, and CopilotKit together...",
      }}
      messageView={messageView}
    />
  );
}
