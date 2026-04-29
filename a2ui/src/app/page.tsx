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
          The service side focuses on generation. The frontend focuses on
          rendering. Both demos talk about a2ui, AGUI, and CopilotKit directly,
          but only V1 uses CopilotKit in the client loop.
        </p>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
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
