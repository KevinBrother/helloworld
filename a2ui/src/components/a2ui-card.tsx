import type { A2uiAnswerCard } from "@/lib/a2ui/types";
import { ProtocolBadge } from "./protocol-badge";

export function A2uiCard({ card }: { card: A2uiAnswerCard }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap gap-2">
        <ProtocolBadge label={card.protocol.toUpperCase()} />
        {card.tags.map((tag) => (
          <ProtocolBadge key={tag} label={tag} />
        ))}
      </div>
      <h3 className="text-lg font-semibold text-slate-950">{card.question}</h3>
      <p className="mt-2 text-sm leading-7 text-slate-700">{card.answer}</p>
    </article>
  );
}
