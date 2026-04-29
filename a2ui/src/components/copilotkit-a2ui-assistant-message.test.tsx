import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { CopilotChatAssistantMessageProps } from "@copilotkit/react-core/v2";
import { CopilotkitA2uiAssistantMessage } from "./copilotkit-a2ui-assistant-message";

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

describe("CopilotkitA2uiAssistantMessage", () => {
  it("renders structured assistant JSON as cards", () => {
    const props = {
      message: {
        id: "assistant-1",
        content: JSON.stringify(payload),
      },
    } as unknown as CopilotChatAssistantMessageProps;

    render(<CopilotkitA2uiAssistantMessage {...props} />);

    expect(
      screen.getByText("Rendered by CopilotKit messageView"),
    ).toBeInTheDocument();
    expect(screen.getByText("What is a2ui?")).toBeInTheDocument();
  });
});
