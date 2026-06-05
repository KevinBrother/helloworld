export function PanelHeading({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="panel-heading">
      <h2>{title}</h2>
      {detail ? <span>{detail}</span> : null}
    </div>
  );
}
