export function ProtocolBadge({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700">
      {label}
    </span>
  );
}
