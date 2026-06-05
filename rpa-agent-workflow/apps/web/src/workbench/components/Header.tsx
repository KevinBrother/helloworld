import { FileUp, Play, Save } from "lucide-react";

export type SaveState = "sample" | "saved" | "saving" | "failed";

type HeaderProps = {
  runPending: boolean;
  serverAvailable: boolean;
  workflowName: string;
  onLoadJSON: () => void;
  onRun: () => void;
};

export function Header({
  runPending,
  serverAvailable,
  workflowName,
  onLoadJSON,
  onRun,
}: HeaderProps) {
  return (
    <header className="workbench-header">
      <div className="product-title">
        <h1>{workflowName}</h1>
      </div>
      <div className="header-actions">
        <button className="secondary-button" onClick={onLoadJSON}>
          <FileUp size={17} />
          加载 JSON
        </button>
        <button className="secondary-button" disabled={!serverAvailable}>
          <Save size={17} />
          保存流程
        </button>
        <button className="primary-button" onClick={onRun} disabled={runPending}>
          <Play size={17} />
          {runPending ? "运行中" : "测试运行"}
        </button>
      </div>
    </header>
  );
}
