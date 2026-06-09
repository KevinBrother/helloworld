import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Dialog,
  Input,
} from "@aientry/ui-components";
import { GitBranch, ListChecks, Plus, Split } from "lucide-react";
import { useMemo, useState } from "react";
import type { BlockOption } from "../../workbenchModel";
import type { InsertNodeSpec } from "../../editOperations";

type CreateNodeModalProps = {
  blocks: BlockOption[];
  feedback?: string;
  pending: boolean;
  onClose: () => void;
  onConfirm: (node: InsertNodeSpec) => void;
};

type CreateKind = "callBlock" | "if" | "parallel";

export function CreateNodeModal({ blocks, feedback, pending, onClose, onConfirm }: CreateNodeModalProps) {
  const [kind, setKind] = useState<CreateKind>("callBlock");
  const [query, setQuery] = useState("");
  const [selectedBlock, setSelectedBlock] = useState(blocks[0]?.key ?? "");
  const [branchCount, setBranchCount] = useState(2);
  const filteredBlocks = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return blocks;
    return blocks.filter((block) => `${block.key} ${block.category} ${block.detail}`.toLowerCase().includes(normalized));
  }, [blocks, query]);

  const canConfirm = kind === "callBlock" ? selectedBlock !== "" : branchCount >= 2;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <div className="modal-backdrop" role="presentation">
        <Card aria-modal="true" className="node-edit-modal" role="dialog">
          <CardHeader>
            <CardTitle>新建节点</CardTitle>
          </CardHeader>
          <CardContent>

        <div className="node-kind-picker" aria-label="选择节点类型">
          <Button className={kind === "callBlock" ? "selected" : ""} variant="outline" onClick={() => setKind("callBlock")} type="button">
            <ListChecks size={18} />
            动作
          </Button>
          <Button className={kind === "if" ? "selected" : ""} variant="outline" onClick={() => setKind("if")} type="button">
            <GitBranch size={18} />
            条件
          </Button>
          <Button className={kind === "parallel" ? "selected" : ""} variant="outline" onClick={() => setKind("parallel")} type="button">
            <Split size={18} />
            并行
          </Button>
        </div>

        {kind === "callBlock" ? (
          <div className="node-modal-section">
            <label className="search-field compact">
              <Input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索动作 block" />
            </label>
            <div className="modal-block-list">
              {filteredBlocks.map((block) => (
                <button
                  className={selectedBlock === block.key ? "modal-block-option selected" : "modal-block-option"}
                  key={block.key}
                  onClick={() => setSelectedBlock(block.key)}
                  type="button"
                >
                  <span>
                    <strong>{block.key}</strong>
                    <small>{block.detail}</small>
                  </span>
                  <em>{block.category}</em>
                </button>
              ))}
              {filteredBlocks.length === 0 ? <p className="modal-empty">没有匹配的 block。</p> : null}
            </div>
          </div>
        ) : (
          <label className="node-modal-section branch-count-field">
            <span>{kind === "if" ? "条件分支数量" : "并行分支数量"}</span>
            <Input min={2} step={1} type="number" value={branchCount} onChange={(event) => setBranchCount(Number(event.target.value))} />
          </label>
        )}

        {feedback ? (
          <p className="node-modal-feedback" role="status">
            {feedback}
          </p>
        ) : null}
          </CardContent>

        <CardFooter className="modal-actions">
          <Button className="secondary-button" disabled={pending} variant="outline" onClick={onClose} type="button">
            取消
          </Button>
          <Button
            className="primary-button"
            disabled={pending || !canConfirm}
            onClick={() => {
              if (kind === "callBlock") {
                onConfirm({ kind: "callBlock", block: selectedBlock });
                return;
              }
              onConfirm({ kind, branchCount });
            }}
            type="button"
          >
            <Plus size={18} />
            {pending ? "新增中" : "确认"}
          </Button>
        </CardFooter>
        </Card>
      </div>
    </Dialog>
  );
}
