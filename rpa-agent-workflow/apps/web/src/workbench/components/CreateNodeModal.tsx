import { GitBranch, ListChecks, Plus, Split } from "lucide-react";
import { useMemo, useState } from "react";
import type { BlockOption } from "../../workbenchModel";
import type { InsertNodeSpec } from "../../editOperations";

type CreateNodeModalProps = {
  blocks: BlockOption[];
  pending: boolean;
  onClose: () => void;
  onConfirm: (node: InsertNodeSpec) => void;
};

type CreateKind = "callBlock" | "if" | "parallel";

export function CreateNodeModal({ blocks, pending, onClose, onConfirm }: CreateNodeModalProps) {
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
    <div className="modal-backdrop" role="presentation">
      <section aria-modal="true" className="node-edit-modal" role="dialog">
        <header>
          <h2>新建节点</h2>
        </header>

        <div className="node-kind-picker" aria-label="选择节点类型">
          <button className={kind === "callBlock" ? "selected" : ""} onClick={() => setKind("callBlock")} type="button">
            <ListChecks size={18} />
            动作
          </button>
          <button className={kind === "if" ? "selected" : ""} onClick={() => setKind("if")} type="button">
            <GitBranch size={18} />
            条件
          </button>
          <button className={kind === "parallel" ? "selected" : ""} onClick={() => setKind("parallel")} type="button">
            <Split size={18} />
            并行
          </button>
        </div>

        {kind === "callBlock" ? (
          <div className="node-modal-section">
            <label className="search-field compact">
              <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索动作 block" />
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
            <input min={2} step={1} type="number" value={branchCount} onChange={(event) => setBranchCount(Number(event.target.value))} />
          </label>
        )}

        <footer className="modal-actions">
          <button className="secondary-button" disabled={pending} onClick={onClose} type="button">
            取消
          </button>
          <button
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
            确认
          </button>
        </footer>
      </section>
    </div>
  );
}
