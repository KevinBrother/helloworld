import { Play, Save } from "lucide-react";

export type SaveState = "sample" | "saved" | "saving" | "failed";

type HeaderProps = {
  runPending: boolean;
  status: string;
  workflowName: string;
  onSave: () => void;
  onRun: () => void;
};

export function Header({
  runPending,
  status,
  workflowName,
  onSave,
  onRun,
}: HeaderProps) {
  return (
    <header className="workbench-header">
      <div className="product-title">
        <h1>{workflowName}</h1>
        <p>{status}</p>
      </div>
      <div className="header-actions">
        <button className="secondary-button" onClick={onSave}>
          <Save size={17} />
          保存流程
        </button>
        <button className="primary-button" onClick={onRun}>
          <Play size={17} />
          {runPending ? "运行中" : "运行"}
        </button>
      </div>
    </header>
  );
}
