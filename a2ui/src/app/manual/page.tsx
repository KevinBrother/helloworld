import { ManualAgentForm } from "@/components/manual-agent-form";

export default function ManualPage() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-10">
      <div className="mb-8 space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
          V2
        </p>
        <h1 className="text-4xl font-semibold text-slate-950">
          Manual AGUI + a2ui rendering
        </h1>
        <p className="max-w-3xl text-base leading-7 text-slate-600">
          This version removes CopilotKit from the client loop. The page calls
          the AGUI endpoint directly and reuses the same a2ui card renderer, so
          you can see the protocol boundary more clearly.
        </p>
      </div>

      <ManualAgentForm />
    </main>
  );
}
