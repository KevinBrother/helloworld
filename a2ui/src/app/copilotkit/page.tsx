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
          Real a2ui pipeline: a <code>BuiltInAgent</code> calls the LLM, which
          invokes the <code>show_learning_cards</code> tool. The tool returns{" "}
          <code>{"{ a2ui_operations: [...] }"}</code>, which the{" "}
          <code>A2UIMiddleware</code> converts to an{" "}
          <code>ACTIVITY_SNAPSHOT</code> event. The frontend renders it via{" "}
          <code>createA2UIMessageRenderer</code> registered on{" "}
          <code>CopilotKit</code>.
        </p>
      </div>

      <CopilotkitDemoShell />
    </main>
  );
}
