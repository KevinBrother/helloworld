import { Badge, Input } from "@aientry/ui-components";
import { Search } from "lucide-react";
import type { WorkbenchModel } from "../../workbenchModel";

type NodeLibraryProps = {
  blocks: WorkbenchModel["blockOptions"];
  query: string;
  onQueryChange: (value: string) => void;
};

export function NodeLibrary({ blocks, query, onQueryChange }: NodeLibraryProps) {
  return (
    <aside className="panel node-library">
      <label className="search-field">
        <Search size={16} />
        <Input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="搜索模块或控制节点" />
      </label>
      <div className="block-list">
        {blocks.map((block) => (
          <button className="block-option" key={block.key}>
            <span>
              <strong>{block.key}</strong>
              <small>{block.detail}</small>
            </span>
            <Badge variant="secondary">{block.category}</Badge>
            {block.instances > 0 ? <Badge>{block.instances}</Badge> : null}
          </button>
        ))}
      </div>
    </aside>
  );
}
