import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@aientry/ui-components";
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
  const hasErrors = Object.keys(errors).length > 0;
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent aria-describedby={undefined} className="run-modal" showCloseButton={false}>
        <DialogHeader className="modal-header">
          <div>
            <DialogTitle>运行流程</DialogTitle>
            <p>{hasErrors ? "请先修正流程输入" : runMessage}</p>
          </div>
          <Button className="icon-button" variant="outline" aria-label="关闭运行" onClick={onClose}>
            <X size={18} />
          </Button>
        </DialogHeader>
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
        <DialogFooter className="modal-actions">
          <Button className="secondary-button" variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button className="primary-button" onClick={onRun}>
            <Play size={17} />
            {pending ? "运行中" : "运行"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
