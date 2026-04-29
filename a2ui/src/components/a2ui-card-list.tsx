import type { A2uiAnswerPayload } from "@/lib/a2ui/types";
import { A2uiCard } from "./a2ui-card";
import { FollowUpPanel } from "./follow-up-panel";

export function A2uiCardList({
  payload,
  title,
}: {
  payload: A2uiAnswerPayload;
  title: string;
}) {
  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-2xl font-semibold text-slate-950">{title}</h2>
        <p className="text-sm text-slate-600">
          Topic: {payload.topic} · Agent: {payload.agent}
        </p>
      </header>
      <div className="grid gap-4">
        {payload.cards.map((card) => (
          <A2uiCard key={card.id} card={card} />
        ))}
      </div>
      <FollowUpPanel text={payload.followUp} />
    </section>
  );
}
