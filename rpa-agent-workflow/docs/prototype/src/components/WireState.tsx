type WireStateProps = {
  title: string;
  description: string;
  tone?: 'neutral' | 'warning' | 'error';
};

export function WireState({ title, description, tone = 'neutral' }: WireStateProps) {
  return (
    <section className={`wire-state wire-state-${tone}`}>
      <div className="wire-state-block" />
      <h3>{title}</h3>
      <p>{description}</p>
    </section>
  );
}
