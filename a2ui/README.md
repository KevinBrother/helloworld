# a2ui / AGUI / CopilotKit Demo

A small **pnpm + TypeScript + Next.js** learning project that shows the same structured Q&A experience in two ways:

1. **V1: CopilotKit + AGUI + a2ui**
2. **V2: Manual AGUI flow + a2ui rendering**

The backend side focuses on **generation**. The frontend side focuses on **rendering**.

## What this demo teaches

- **a2ui**: the agent returns UI-ready structured data instead of only plain text
- **AGUI**: the protocol boundary between service and UI
- **CopilotKit**: the orchestration layer used in the V1 chat experience

## Pages

| Route | Purpose |
| --- | --- |
| `/` | Landing page that explains both learning paths |
| `/copilotkit` | V1 using CopilotKit chat orchestration |
| `/manual` | V2 calling the AGUI endpoint directly |

## Architecture

### Shared generation contract

The server generates one `A2uiAnswerPayload`:

```ts
type A2uiAnswerPayload = {
  topic: string;
  agent: "agui-learning-agent";
  followUp: string;
  cards: Array<{
    id: string;
    question: string;
    answer: string;
    tags: string[];
    protocol: "a2ui";
  }>;
};
```

### Shared rendering path

- `src/components/a2ui-card-list.tsx` renders the payload as Q&A cards
- Both V1 and V2 reuse that same renderer

### Service side

- `src/app/api/agui/awp/route.ts`
- Returns AGUI-style SSE events
- Emits a JSON string payload that the frontend parses and renders

### V1: CopilotKit flow

- `src/app/api/copilotkit-a2ui-fixed-schema/route.ts`
- `src/components/copilotkit-demo-shell.tsx`
- CopilotKit drives the chat UI, while the AGUI route still supplies the structured payload

### V2: Manual AGUI flow

- `src/components/manual-agent-form.tsx`
- Uses `HttpAgent` from `@ag-ui/client`
- Calls `/api/agui` directly and renders the same payload without CopilotKit in the client loop

## Run locally

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

## Useful commands

```bash
pnpm lint
pnpm test
pnpm build
```

## Suggested learning order

1. Open `/copilotkit` and observe how CopilotKit wraps the chat experience
2. Open `/manual` and compare the direct AGUI call path
3. Read `src/app/api/agui/awp/route.ts` to see the generated AGUI SSE events
4. Read `src/lib/a2ui/generate-cards.ts` and `src/components/a2ui-card-list.tsx` to connect generation and rendering
