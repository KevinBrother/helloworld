import { CopilotkitDemoShell } from "@/components/copilotkit-demo-shell";

export default function CopilotkitPage() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10">
      <div className="mb-8 space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
          V1
        </p>
        <h1 className="text-4xl font-semibold text-slate-950">
          CopilotKit + AGUI + a2ui
        </h1>
        <p className="max-w-3xl text-base leading-7 text-slate-600">
          This page uses CopilotKit to orchestrate the chat while the service
          returns structured a2ui data through an AGUI-style route. The frontend
          renders the assistant JSON as Q&A cards.
        </p>
      </div>

      <CopilotkitDemoShell />
    </main>
  );
}
