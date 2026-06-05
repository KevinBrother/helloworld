import { Play, X } from "lucide-react";
import type { WorkbenchField, WorkbenchModel, WorkbenchNode } from "../../workbenchModel";
import { ParameterFieldList } from "./ParameterPanel";

type RunModalProps = {
  errors?: Record<string, string>;
  model: WorkbenchModel;
  pending: boolean;
  runMessage: string;
  workflowInputNode?: WorkbenchNode;
  openSourceKey: string | null;
  onClose: () => void;
  onFieldChange: (field: WorkbenchField, value: unknown) => void;
  onOpenSourceKeyChange: (key: string | null) => void;
  onRun: () => void;
};

export function RunModal({
  errors = {},
  model,
  pending,
  runMessage,
  workflowInputNode,
  openSourceKey,
  onClose,
  onFieldChange,
  onOpenSourceKeyChange,
  onRun,
}: RunModalProps) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="run-modal" role="dialog" aria-modal="true" aria-labelledby="run-title">
        <div className="modal-header">
          <div>
            <h2 id="run-title">运行流程</h2>
            <p>{runMessage}</p>
          </div>
          <button className="icon-button" aria-label="关闭运行" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="run-inputs-panel">
          <div className="modal-section-title">
            <h3>流程输入</h3>
            <span>{workflowInputNode?.inputs.length ?? 0} 个参数</span>
          </div>
          <div className="schema-box">
            {workflowInputNode ? (
            <ParameterFieldList
                errors={errors}
                fields={workflowInputNode.inputs}
                model={model}
                node={workflowInputNode}
                openSourceKey={openSourceKey}
                onFieldChange={onFieldChange}
                onOpenSourceKeyChange={onOpenSourceKeyChange}
              />
            ) : (
              <div className="empty-state">没有流程输入。</div>
            )}
          </div>
        </div>
        <div className="modal-actions">
          <button className="secondary-button" onClick={onClose}>
            取消
          </button>
          <button className="primary-button" onClick={onRun}>
            <Play size={17} />
            {pending ? "运行中" : "运行"}
          </button>
        </div>
      </section>
    </div>
  );
}
