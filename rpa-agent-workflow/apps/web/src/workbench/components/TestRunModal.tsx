import { Play, X } from "lucide-react";
import type { WorkbenchField, WorkbenchModel, WorkbenchNode } from "../../workbenchModel";
import { ParameterFieldList } from "./ParameterPanel";

type TestRunModalProps = {
  errors?: Record<string, string>;
  model: WorkbenchModel;
  pending: boolean;
  serverAvailable: boolean;
  workflowInputNode?: WorkbenchNode;
  openSourceKey: string | null;
  onClose: () => void;
  onFieldChange: (field: WorkbenchField, value: unknown) => void;
  onOpenSourceKeyChange: (key: string | null) => void;
  onRun: () => void;
};

export function TestRunModal({
  errors = {},
  model,
  pending,
  serverAvailable,
  workflowInputNode,
  openSourceKey,
  onClose,
  onFieldChange,
  onOpenSourceKeyChange,
  onRun,
}: TestRunModalProps) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="test-modal" role="dialog" aria-modal="true" aria-labelledby="test-run-title">
        <div className="modal-header">
          <div>
            <h2 id="test-run-title">Test run workflow</h2>
            <p>{serverAvailable ? "Run the current workflow on the server." : "Start the workflow service to run this workflow."}</p>
          </div>
          <button className="icon-button" aria-label="Close test run" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="run-inputs-panel">
          <div className="modal-section-title">
            <h3>Workflow inputs</h3>
            <span>{workflowInputNode?.inputs.length ?? 0} inputs</span>
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
              <div className="empty-state">No workflow inputs.</div>
            )}
          </div>
        </div>
        <div className="modal-actions">
          <button className="secondary-button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-button" onClick={onRun} disabled={pending || !serverAvailable || Object.keys(errors).length > 0}>
            <Play size={17} />
            {pending ? "Running" : "Run test"}
          </button>
        </div>
      </section>
    </div>
  );
}
