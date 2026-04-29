import { render } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@copilotkit/react-core/v2", async () => {
  const React = await import("react");
  const ProviderContext = React.createContext(false);

  return {
    CopilotKit: ({ children }: { children: React.ReactNode }) => (
      <ProviderContext.Provider value>{children}</ProviderContext.Provider>
    ),
    CopilotChat: () => <div data-testid="copilot-chat" />,
    CopilotChatAssistantMessage: () => null,
    useAgentContext: () => {
      if (!React.useContext(ProviderContext)) {
        throw new Error("CopilotKit hooks must be used inside <CopilotKit>");
      }
    },
    useConfigureSuggestions: () => {
      if (!React.useContext(ProviderContext)) {
        throw new Error("CopilotKit hooks must be used inside <CopilotKit>");
      }
    },
  };
});

import { CopilotkitDemoShell } from "./copilotkit-demo-shell";

describe("CopilotkitDemoShell", () => {
  it("renders without calling CopilotKit hooks outside the provider", () => {
    expect(() => render(<CopilotkitDemoShell />)).not.toThrow();
  });
});
