import { Search } from "lucide-react";
import type { WorkbenchModel } from "../../workbenchModel";
import { PanelHeading } from "./PanelHeading";

type NodeLibraryProps = {
  blocks: WorkbenchModel["blockOptions"];
  query: string;
  onQueryChange: (value: string) => void;
};

export function NodeLibrary({ blocks, query, onQueryChange }: NodeLibraryProps) {
  return (
    <aside className="panel node-library">
      <PanelHeading title="Block library" detail={`${blocks.length} available`} />
      <label className="search-field">
        <Search size={16} />
        <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search block or control node" />
      </label>
      <div className="block-list">
        {blocks.map((block) => (
          <button className="block-option" key={block.key}>
            <span>
              <strong>{block.key}</strong>
              <small>{block.detail}</small>
            </span>
            <em>{block.category}</em>
            {block.instances > 0 ? <b>{block.instances}</b> : null}
          </button>
        ))}
      </div>
    </aside>
  );
}
