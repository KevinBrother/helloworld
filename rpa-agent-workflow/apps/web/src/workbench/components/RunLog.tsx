import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { RunResult } from "../../types";

type RunLogProps = {
  lines: string[];
  open: boolean;
  result: RunResult | null;
  onOpenChange: (open: boolean) => void;
};

const MIN_LOG_HEIGHT = 88;
const DEFAULT_LOG_HEIGHT = 132;

export function RunLog({ lines, open, result, onOpenChange }: RunLogProps) {
  const [bodyHeight, setBodyHeight] = useState(DEFAULT_LOG_HEIGHT);
  const dragStartRef = useRef<{ y: number; height: number } | null>(null);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const dragStart = dragStartRef.current;
      if (!dragStart) return;
      const maxHeight = Math.max(MIN_LOG_HEIGHT, Math.floor(window.innerHeight * 0.58));
      const nextHeight = dragStart.height + dragStart.y - event.clientY;
      setBodyHeight(Math.min(maxHeight, Math.max(MIN_LOG_HEIGHT, nextHeight)));
    };

    const stopDragging = () => {
      dragStartRef.current = null;
      document.body.classList.remove("resizing-run-log");
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopDragging);
    window.addEventListener("pointercancel", stopDragging);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopDragging);
      window.removeEventListener("pointercancel", stopDragging);
      document.body.classList.remove("resizing-run-log");
    };
  }, []);

  return (
    <section className={open ? "run-log open" : "run-log"}>
      {open ? (
        <div
          aria-label="Resize run output"
          className="run-log-resize-handle"
          role="separator"
          tabIndex={0}
          onPointerDown={(event) => {
            dragStartRef.current = { y: event.clientY, height: bodyHeight };
            document.body.classList.add("resizing-run-log");
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
        />
      ) : null}
      <button className="run-log-header" onClick={() => onOpenChange(!open)} aria-expanded={open}>
        <span>Run output</span>
        {result?.returns ? <strong>{JSON.stringify(result.returns)}</strong> : null}
        {open ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
      </button>
      {open ? (
        <div className="run-log-body" style={{ height: bodyHeight }}>
          {lines.map((line, index) => (
            <code key={`${line}-${index}`}>{line}</code>
          ))}
        </div>
      ) : null}
    </section>
  );
}
