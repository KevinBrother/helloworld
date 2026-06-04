import { Play, X } from "lucide-react";

type TestRunModalProps = {
  pending: boolean;
  serverAvailable: boolean;
  onClose: () => void;
  onRun: () => void;
};

export function TestRunModal({ pending, serverAvailable, onClose, onRun }: TestRunModalProps) {
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
        <div className="server-run-note">Run output is populated only from the server response.</div>
        <div className="modal-actions">
          <button className="secondary-button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-button" onClick={onRun} disabled={pending || !serverAvailable}>
            <Play size={17} />
            {pending ? "Running" : "Run test"}
          </button>
        </div>
      </section>
    </div>
  );
}
