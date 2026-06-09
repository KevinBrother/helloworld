import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Dialog,
} from "@aientry/ui-components";
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
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <div className="modal-backdrop" role="presentation">
      <Card aria-modal="true" className="node-edit-modal compact-modal" role="dialog">
        <CardHeader>
          <CardTitle>删除节点</CardTitle>
        </CardHeader>
        <CardContent className="delete-confirm-copy">
          <strong>{node.label}</strong>
          <p>{node.hasNestedChildren ? "该节点包含子节点，确认后会删除整棵子流程。" : "确认后会从当前流程中删除该节点。"}</p>
        </CardContent>
        <CardFooter className="modal-actions">
          <Button className="secondary-button" disabled={pending} variant="outline" onClick={onClose} type="button">
            取消
          </Button>
          <Button className="danger-button" disabled={pending} variant="destructive" onClick={onConfirm} type="button">
            <Trash2 size={18} />
            删除
          </Button>
        </CardFooter>
      </Card>
      </div>
    </Dialog>
  );
}
