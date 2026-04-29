export function FollowUpPanel({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-700">
      <strong className="mr-2 text-slate-950">Follow up:</strong>
      {text}
    </div>
  );
}
