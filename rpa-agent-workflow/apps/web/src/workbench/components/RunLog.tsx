import { ChevronDown, ChevronUp } from "lucide-react";
import type { RunResult } from "../../types";

type RunLogProps = {
  lines: string[];
  open: boolean;
  result: RunResult | null;
  onOpenChange: (open: boolean) => void;
};

export function RunLog({ lines, open, result, onOpenChange }: RunLogProps) {
  return (
    <section className={open ? "run-log open" : "run-log"}>
      <button className="run-log-header" onClick={() => onOpenChange(!open)} aria-expanded={open}>
        <span>Run output</span>
        {result?.returns ? <strong>{JSON.stringify(result.returns)}</strong> : null}
        {open ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
      </button>
      {open ? (
        <div className="run-log-body">
          {lines.map((line, index) => (
            <code key={`${line}-${index}`}>{line}</code>
          ))}
        </div>
      ) : null}
    </section>
  );
}
