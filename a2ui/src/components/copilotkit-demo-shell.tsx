"use client";

import {
  CopilotChat,
  CopilotKit,
  useAgentContext,
  useConfigureSuggestions,
  createA2UIMessageRenderer,
  a2uiDefaultTheme,
} from "@copilotkit/react-core/v2";

// Create the A2UI renderer once (outside component to avoid re-instantiation).
// The renderer is registered on CopilotKit and handles all ACTIVITY_SNAPSHOT
// events that carry a2ui surfaces emitted by the A2UIMiddleware on the backend.
const a2uiRenderer = createA2UIMessageRenderer({ theme: a2uiDefaultTheme });

const SYSTEM_PROMPT = `
You are a learning assistant for a2ui, AGUI, and CopilotKit.
When the user asks about any concept, always call show_learning_cards to
render beautiful visual cards. Do not answer with plain text only.
`.trim();

const SUGGESTIONS = [
  "Explain a2ui, AGUI, and CopilotKit together.",
  "How does CopilotKit consume AGUI data?",
  "Why does a2ui help frontend rendering?",
];

export function CopilotkitDemoShell() {
  return (
    // renderActivityMessages wires the A2UI renderer into the CopilotKit
    // provider so that every ActivityMessage of type "a2ui-surface" is
    // rendered via the real @google/a2ui component library.
    <CopilotKit
      runtimeUrl="/api/copilotkit"
      renderActivityMessages={[a2uiRenderer]}
    >
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <ConfiguredCopilotChat />
      </div>
    </CopilotKit>
  );
}

function ConfiguredCopilotChat() {
  useAgentContext({
    description: "Learning assistant instructions",
    value: SYSTEM_PROMPT,
  });

  useConfigureSuggestions({
    suggestions: SUGGESTIONS.map((message) => ({ title: message, message })),
    available: "always",
  });

  return (
    <CopilotChat
      className="h-[700px]"
      labels={{
        modalHeaderTitle: "a2ui / AGUI / CopilotKit",
        welcomeMessageText:
          "Ask a question and I will render structured a2ui cards.",
        chatInputPlaceholder: "Explain a2ui, AGUI, and CopilotKit together...",
      }}
    />
  );
}
