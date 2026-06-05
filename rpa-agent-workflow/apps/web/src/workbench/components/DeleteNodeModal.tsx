import { Trash2 } from "lucide-react";
import type { WorkbenchNode } from "../../workbenchModel";

type DeleteNodeModalProps = {
  node: WorkbenchNode;
  pending: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function DeleteNodeModal({ node, pending, onClose, onConfirm }: DeleteNodeModalProps) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section aria-modal="true" className="node-edit-modal compact-modal" role="dialog">
        <header>
          <h2>删除节点</h2>
        </header>
        <div className="delete-confirm-copy">
          <strong>{node.label}</strong>
          <p>{node.hasNestedChildren ? "该节点包含子节点，确认后会删除整棵子流程。" : "确认后会从当前流程中删除该节点。"}</p>
        </div>
        <footer className="modal-actions">
          <button className="secondary-button" disabled={pending} onClick={onClose} type="button">
            取消
          </button>
          <button className="danger-button" disabled={pending} onClick={onConfirm} type="button">
            <Trash2 size={18} />
            删除
          </button>
        </footer>
      </section>
    </div>
  );
}
