import { describe, expect, it } from "vitest";
import { generateA2uiPayload } from "./generate-cards";

describe("generateA2uiPayload", () => {
  it("returns structured cards for a2ui/agui/copilotkit prompts", () => {
    const result = generateA2uiPayload("Explain a2ui and AGUI with CopilotKit");

    expect(result.topic).toContain("a2ui");
    expect(result.cards).toHaveLength(3);
    expect(result.cards[0]).toMatchObject({
      protocol: "a2ui",
    });
    expect(result.followUp.length).toBeGreaterThan(0);
  });

  it("falls back to generic educational cards for unknown prompts", () => {
    const result = generateA2uiPayload("something unrelated");

    expect(result.cards.length).toBeGreaterThan(0);
    expect(
      result.cards.some((card) => card.answer.includes("CopilotKit")),
    ).toBe(true);
  });
});
