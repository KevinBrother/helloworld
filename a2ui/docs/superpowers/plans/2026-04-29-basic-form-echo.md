# Basic Form Echo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new standalone demo page with one input and one button that posts a value to a Next.js Route Handler and renders the echoed server response on the page.

**Architecture:** Keep the feature separate from the existing AGUI demos. Use a server `page.tsx` route to frame the demo, a focused client component to manage form state and `fetch`, and a small Route Handler that validates JSON input and returns `{ received: value }`.

**Tech Stack:** Next.js 16 App Router, React 19 client components, TypeScript, Vitest, Testing Library

---

### Task 1: Add the echo API route

**Files:**
- Create: `src/app/api/basic-form/route.ts`
- Create: `src/app/api/basic-form/route.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("POST /api/basic-form", () => {
  it("returns 400 when value is blank", async () => {
    const request = new Request("http://localhost/api/basic-form", {
      method: "POST",
      body: JSON.stringify({ value: "   " }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "Please enter a value." });
  });

  it("echoes the submitted value", async () => {
    const request = new Request("http://localhost/api/basic-form", {
      method: "POST",
      body: JSON.stringify({ value: "hello from client" }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ received: "hello from client" });
  });
});
```

- [ ] **Step 2: Run the route test and verify it fails**

Run: `pnpm test -- src/app/api/basic-form/route.test.ts`

Expected: `FAIL` because `src/app/api/basic-form/route.ts` does not exist yet.

- [ ] **Step 3: Write the minimal route implementation**

```ts
type BasicFormRequest = {
  value?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as BasicFormRequest;
  const value = typeof body.value === "string" ? body.value : "";

  if (!value.trim()) {
    return Response.json({ error: "Please enter a value." }, { status: 400 });
  }

  return Response.json({ received: value });
}
```

- [ ] **Step 4: Run the route test and verify it passes**

Run: `pnpm test -- src/app/api/basic-form/route.test.ts`

Expected: `PASS` with 2 passing tests for blank input rejection and echo response.

- [ ] **Step 5: Commit the route work**

```bash
git add src/app/api/basic-form/route.ts src/app/api/basic-form/route.test.ts
git commit -m "feat: add basic form echo route" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 2: Add the client form component

**Files:**
- Create: `src/components/basic-form-demo.tsx`
- Create: `src/components/basic-form-demo.test.tsx`

- [ ] **Step 1: Write the failing component test**

```ts
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BasicFormDemo } from "./basic-form-demo";

describe("BasicFormDemo", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("submits the input and renders the echoed response", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ received: "hello from client" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const user = userEvent.setup();

    render(<BasicFormDemo />);

    await user.clear(screen.getByLabelText("Message"));
    await user.type(screen.getByLabelText("Message"), "hello from client");
    await user.click(screen.getByRole("button", { name: "Send to server" }));

    expect(fetchSpy).toHaveBeenCalledWith("/api/basic-form", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ value: "hello from client" }),
    });
    expect(
      await screen.findByText("server received: hello from client"),
    ).toBeInTheDocument();
  });

  it("shows a loading label while waiting for the server", async () => {
    let resolveResponse:
      | ((value: Response | PromiseLike<Response>) => void)
      | undefined;

    vi.spyOn(global, "fetch").mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveResponse = resolve;
        }),
    );
    const user = userEvent.setup();

    render(<BasicFormDemo />);

    await user.click(screen.getByRole("button", { name: "Send to server" }));

    expect(
      screen.getByRole("button", { name: "Sending..." }),
    ).toBeDisabled();

    resolveResponse?.(
      new Response(JSON.stringify({ received: "hello from client" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    expect(
      await screen.findByText("server received: hello from client"),
    ).toBeInTheDocument();
  });

  it("clears the previous success result and shows the server error", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");

    fetchSpy
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ received: "hello from client" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Please enter a value." }), {
          status: 400,
          headers: { "content-type": "application/json" },
        }),
      );

    const user = userEvent.setup();

    render(<BasicFormDemo />);

    await user.click(screen.getByRole("button", { name: "Send to server" }));
    expect(
      await screen.findByText("server received: hello from client"),
    ).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Message"));
    await user.click(screen.getByRole("button", { name: "Send to server" }));

    expect(
      screen.queryByText("server received: hello from client"),
    ).not.toBeInTheDocument();
    expect(await screen.findByText("Please enter a value.")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the component test and verify it fails**

Run: `pnpm test -- src/components/basic-form-demo.test.tsx`

Expected: `FAIL` because `src/components/basic-form-demo.tsx` does not exist yet.

- [ ] **Step 3: Write the minimal client component**

```tsx
"use client";

import { useState } from "react";

type BasicFormResponse = {
  received?: string;
  error?: string;
};

export function BasicFormDemo() {
  const [value, setValue] = useState("hello from client");
  const [received, setReceived] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit() {
    setIsLoading(true);
    setError(null);
    setReceived(null);

    try {
      const response = await fetch("/api/basic-form", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ value }),
      });
      const body = (await response.json()) as BasicFormResponse;

      if (!response.ok || !body.received) {
        setError(body.error ?? "Basic form request failed.");
        return;
      }

      setReceived(body.received);
    } catch {
      setError("Basic form request failed.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <label htmlFor="basic-form-value" className="text-sm font-medium text-slate-700">
          Message
        </label>
        <input
          id="basic-form-value"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isLoading}
          className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {isLoading ? "Sending..." : "Send to server"}
        </button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {received ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          {`server received: ${received}`}
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 4: Run the component test and verify it passes**

Run: `pnpm test -- src/components/basic-form-demo.test.tsx`

Expected: `PASS` with 3 passing tests for success, loading, and error handling.

- [ ] **Step 5: Commit the component work**

```bash
git add src/components/basic-form-demo.tsx src/components/basic-form-demo.test.tsx
git commit -m "feat: add basic form demo component" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 3: Add the page route and landing-page entry

**Files:**
- Create: `src/app/basic-form/page.tsx`
- Create: `src/app/basic-form/page.test.tsx`
- Create: `src/app/page.test.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Write the failing page tests**

```ts
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import BasicFormPage from "./page";

describe("BasicFormPage", () => {
  it("renders the minimal client-server demo copy", () => {
    render(<BasicFormPage />);

    expect(
      screen.getByRole("heading", { name: "Basic input + button demo" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Send a single input value to a Next.js route and render the echoed response.",
      ),
    ).toBeInTheDocument();
  });
});
```

```ts
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "./page";

describe("HomePage", () => {
  it("links to the basic form demo", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("link", { name: /V3 · Basic input \\+ button/i }),
    ).toHaveAttribute("href", "/basic-form");
    expect(
      screen.getByText(
        "The smallest client/server demo in the project: send one value and see the server echo it back.",
      ),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the page tests and verify they fail**

Run: `pnpm test -- src/app/basic-form/page.test.tsx src/app/page.test.tsx`

Expected: `FAIL` because the new page does not exist and the landing page does not list the new demo yet.

- [ ] **Step 3: Add the new page and landing-page card**

```tsx
import { BasicFormDemo } from "@/components/basic-form-demo";

export default function BasicFormPage() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-10">
      <div className="mb-8 space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
          V3
        </p>
        <h1 className="text-4xl font-semibold text-slate-950">
          Basic input + button demo
        </h1>
        <p className="max-w-3xl text-base leading-7 text-slate-600">
          Send a single input value to a Next.js route and render the echoed response.
        </p>
      </div>

      <BasicFormDemo />
    </main>
  );
}
```

```tsx
import Link from "next/link";

const demos = [
  {
    href: "/copilotkit",
    title: "V1 · CopilotKit + AGUI + a2ui",
    description:
      "Use CopilotKit chat orchestration while the service returns structured a2ui cards.",
  },
  {
    href: "/manual",
    title: "V2 · Manual AGUI flow",
    description:
      "Call the AGUI endpoint directly and compare the same payload/rendering path without CopilotKit.",
  },
  {
    href: "/basic-form",
    title: "V3 · Basic input + button",
    description:
      "The smallest client/server demo in the project: send one value and see the server echo it back.",
  },
];

export default function HomePage() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-12">
      <div className="max-w-3xl space-y-4">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
          Learning Demo
        </p>
        <h1 className="text-5xl font-semibold tracking-tight text-slate-950">
          Learn a2ui, AGUI, and CopilotKit by comparing two flows
        </h1>
        <p className="text-base leading-8 text-slate-600">
          The service side focuses on generation. The frontend focuses on rendering.
          Both demos talk about a2ui, AGUI, and CopilotKit directly, but only V1 uses
          CopilotKit in the client loop.
        </p>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {demos.map((demo) => (
          <Link
            key={demo.href}
            href={demo.href}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <h2 className="text-2xl font-semibold text-slate-950">
              {demo.title}
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              {demo.description}
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Run the page tests and verify they pass**

Run: `pnpm test -- src/app/basic-form/page.test.tsx src/app/page.test.tsx`

Expected: `PASS` with both page-level tests green.

- [ ] **Step 5: Commit the page integration work**

```bash
git add src/app/basic-form/page.tsx src/app/basic-form/page.test.tsx src/app/page.tsx src/app/page.test.tsx
git commit -m "feat: add basic form demo page" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 4: Run repository verification

**Files:**
- Modify: none

- [ ] **Step 1: Run the full test suite**

Run: `pnpm test`

Expected: `PASS` for the existing tests plus the new route, component, and page tests.

- [ ] **Step 2: Run the linter**

Run: `pnpm lint`

Expected: `PASS` with no new ESLint errors.

- [ ] **Step 3: Run the production build**

Run: `pnpm build`

Expected: `PASS` and the new `/basic-form` route appears in the build output.

- [ ] **Step 4: Check the final git state**

Run: `git --no-pager status --short`

Expected: Only intentional plan or implementation changes remain.
