import { FolderOpen, Play, Save } from "lucide-react";

export type SaveState = "sample" | "saved" | "saving" | "failed";

type HeaderProps = {
  runPending: boolean;
  serverAvailable: boolean;
  status: string;
  workflowName: string;
  onOpenWorkflow: () => void;
  onRun: () => void;
};

export function Header({
  runPending,
  serverAvailable,
  status,
  workflowName,
  onOpenWorkflow,
  onRun,
}: HeaderProps) {
  return (
    <header className="workbench-header">
      <div className="product-title">
        <h1>{workflowName}</h1>
        <p>{status}</p>
      </div>
      <div className="header-actions">
        <button className="secondary-button" onClick={onOpenWorkflow}>
          <FolderOpen size={17} />
          打开工作流
        </button>
        <button className="secondary-button" disabled={!serverAvailable}>
          <Save size={17} />
          保存流程
        </button>
        <button className="primary-button" onClick={onRun}>
          <Play size={17} />
          {runPending ? "运行中" : "测试运行"}
        </button>
      </div>
    </header>
  );
}
