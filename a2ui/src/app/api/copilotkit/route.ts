/**
 * CopilotKit runtime endpoint — V3 (real a2ui pipeline)
 *
 * Architecture:
 *  ┌─────────────┐  tool call  ┌─────────────────────┐  a2ui_operations  ┌────────────────────────┐
 *  │  BuiltInAgent│──────────▶│ show_learning_cards  │──────────────────▶│  A2UI middleware        │
 *  │  (LLM)      │            │  (defineTool)        │                   │  (detects the key,      │
 *  └─────────────┘            └─────────────────────┘                   │  emits ACTIVITY_SNAPSHOT)│
 *                                                                         └────────────────────────┘
 *
 * The LLM decides WHAT to say; the tool builds the A2UI v0.9 component tree.
 * The middleware converts the tool result into an ActivityMessage that the
 * frontend renderer (createA2UIMessageRenderer) turns into real UI.
 *
 * Env vars required in .env.local:
 *   OPENAI_API_KEY=<your-key>
 *   OPENAI_BASE_URL=https://your-proxy/v1   # optional — omit for official OpenAI
 */

import { CopilotRuntime, copilotRuntimeNextJSAppRouterEndpoint } from "@copilotkit/runtime";
import { BuiltInAgent, defineTool } from "@copilotkit/runtime/v2";
import { z } from "zod";
import { NextRequest } from "next/server";

// ── A2UI v0.9 catalog URL ────────────────────────────────────────────────────
const CATALOG_URL = "https://a2ui.org/specification/v0_9/basic_catalog.json";

// ── Tool: show_learning_cards ────────────────────────────────────────────────
// The LLM provides card titles and body text.
// This tool builds the A2UI v0.9 component tree and returns { a2ui_operations: [...] }.
// The A2UIMiddleware (enabled via `a2ui: {}`) detects that key and emits an
// ACTIVITY_SNAPSHOT event, which the frontend createA2UIMessageRenderer renders.
const showLearningCards = defineTool({
  name: "show_learning_cards",
  description:
    "Render concept cards as a rich A2UI surface in the chat. " +
    "Call this whenever the user asks about a concept. " +
    "You control the card titles and explanations; the tool handles visual layout.",
  parameters: z.object({
    surfaceTitle: z.string().describe("Short heading displayed above the cards"),
    cards: z
      .array(
        z.object({
          title: z.string().describe("Card heading (concept name)"),
          body: z.string().describe("2–3 sentence explanation"),
        }),
      )
      .min(1)
      .max(6)
      .describe("The concept cards to render"),
  }),
  execute: async ({ surfaceTitle, cards }) => {
    const surfaceId = "learn-cards";

    // Build a flat v0.9 component list:
    //   root (Column) → [title, list]
    //   list (List)   → [card-0, card-1, ...]
    //   card-N (Card) → card-N-col (Column) → [card-N-title, card-N-body]
    const components: Record<string, unknown>[] = [];

    const cardIds = cards.map((_, i) => `card-${i}`);
    components.push({ id: "root", component: "Column", children: ["surface-title", "cards-list"] });
    components.push({ id: "surface-title", component: "Text", text: surfaceTitle, variant: "h2" });
    components.push({ id: "cards-list", component: "List", children: cardIds, direction: "vertical" });

    for (let i = 0; i < cards.length; i++) {
      const { title, body } = cards[i];
      components.push({ id: `card-${i}`, component: "Card", child: `card-${i}-col` });
      components.push({
        id: `card-${i}-col`,
        component: "Column",
        children: [`card-${i}-title`, `card-${i}-body`],
      });
      components.push({ id: `card-${i}-title`, component: "Text", text: title, variant: "h3" });
      components.push({ id: `card-${i}-body`, component: "Text", text: body, variant: "body" });
    }

    // Return { a2ui_operations: [...] } — the A2UIMiddleware detects this key
    // in TOOL_CALL_RESULT and converts it to an ACTIVITY_SNAPSHOT event.
    return {
      a2ui_operations: [
        { version: "v0.9", createSurface: { surfaceId, catalogId: CATALOG_URL } },
        { version: "v0.9", updateComponents: { surfaceId, components } },
      ],
    };
  },
});

// ── Agent ────────────────────────────────────────────────────────────────────
// BuiltInAgent calls the real LLM. The model string uses the @ai-sdk format:
//   "openai:<model>"  — reads OPENAI_API_KEY + OPENAI_BASE_URL from env.
// Change "gpt-4o-mini" to whatever model your proxy supports.
const builtInAgent = new BuiltInAgent({
  model: (process.env.OPENAI_MODEL as `openai:${string}`) ?? "openai:gpt-4o-mini",
  tools: [showLearningCards],
  maxSteps: 3,
});

// ── Runtime ──────────────────────────────────────────────────────────────────
// `a2ui: {}` enables the A2UIMiddleware with defaults:
//   • No `injectA2UITool` — we don't need the LLM to call render_a2ui directly
//   • Detects `a2ui_operations` key in ANY tool result (our fixed-schema approach)
const runtime = new CopilotRuntime({
  agents: { default: builtInAgent },
  a2ui: {},
});

// ── Next.js App Router handler ────────────────────────────────────────────────
export const POST = async (req: NextRequest) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    endpoint: "/api/copilotkit",
  });
  return handleRequest(req);
};
