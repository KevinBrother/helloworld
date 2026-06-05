import { Plus } from "lucide-react";
import type { NodeRunState, NodeRunStateMap } from "../../runEvents";
import { buildCanvasLayout, getNodeIoLabel, type CanvasLayout, type InsertAnchor, type WorkbenchModel, type WorkbenchNode } from "../../workbenchModel";

type WorkflowCanvasProps = {
  model: WorkbenchModel;
  nodeRunStates: NodeRunStateMap;
  selectedId: string;
  onSelect: (id: string) => void;
  onInsertAtEdge?: (anchor: InsertAnchor) => void;
};

export function WorkflowCanvas({ model, nodeRunStates, selectedId, onSelect, onInsertAtEdge }: WorkflowCanvasProps) {
  const layout = buildCanvasLayout(model);

  return (
    <section className="panel canvas-panel">
      <div className="canvas-scroll">
        <div className="workflow-diagram" style={{ width: layout.width, minHeight: layout.height }} aria-label="流程画布">
          <svg className="workflow-links" viewBox={`0 0 ${layout.width} ${layout.height}`} preserveAspectRatio="none" aria-hidden="true">
            {layout.edges.map((edge) => (
              <path className="flow-link primary" d={getEdgePath(layout, edge.from, edge.to)} key={edge.id} />
            ))}
          </svg>

          {layout.edges.map((edge) => {
            const point = getEdgeMidpoint(layout, edge.from, edge.to);
            if (!point) return null;
            return (
              <button
                aria-label={`在 ${edge.from} 和 ${edge.to} 之间新建节点`}
                className="edge-insert-button"
                key={`insert-${edge.id}`}
                onClick={() => onInsertAtEdge?.(edge.anchor)}
                style={{ left: point.x, top: point.y }}
                type="button"
              >
                <Plus size={16} />
              </button>
            );
          })}

          {layout.nodes.map((layoutNode) => (
            <div
              className="canvas-node-position"
              key={layoutNode.node.id}
              style={{
                left: layoutNode.x - layoutNode.width / 2,
                top: layoutNode.y,
                width: layoutNode.width,
              }}
            >
              <CanvasNode
                node={layoutNode.node}
                runState={nodeRunStates[layoutNode.node.id] ?? "idle"}
                selected={selectedId === layoutNode.node.id}
                onSelect={onSelect}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function getEdgePath(layout: CanvasLayout, fromId: string, toId: string) {
  const from = layout.nodes.find((node) => node.node.id === fromId);
  const to = layout.nodes.find((node) => node.node.id === toId);
  if (!from || !to) return "";

  const startX = from.x;
  const startY = from.y + from.height;
  const endX = to.x;
  const endY = to.y;

  if (startX === endX) {
    return `M${startX} ${startY} L${endX} ${endY}`;
  }

  const midY = Math.round((startY + endY) / 2);
  return `M${startX} ${startY} L${startX} ${midY} L${endX} ${midY} L${endX} ${endY}`;
}

function getEdgeMidpoint(layout: CanvasLayout, fromId: string, toId: string) {
  const from = layout.nodes.find((node) => node.node.id === fromId);
  const to = layout.nodes.find((node) => node.node.id === toId);
  if (!from || !to) return null;

  const startX = from.x;
  const startY = from.y + from.height;
  const endX = to.x;
  const endY = to.y;

  if (startX === endX) {
    return { x: Math.round((startX + endX) / 2), y: Math.round((startY + endY) / 2) };
  }

  return { x: Math.round((startX + endX) / 2), y: Math.round((startY + endY) / 2) };
}

function CanvasNode({ node, runState, selected, onSelect }: { node?: WorkbenchNode; runState: NodeRunState; selected: boolean; onSelect: (id: string) => void }) {
  if (!node) return null;
  const stateLabel = getRunStateLabel(runState);

  return (
    <button className={getCanvasNodeClassName(selected, runState)} onClick={() => onSelect(node.id)}>
      <span className="node-kind-row">
        <span className="node-kind">{node.kind === "sequence" && node.order === 0 ? "流程输入" : node.kind}</span>
        {stateLabel ? <span className={`node-run-indicator ${runState}`}>{stateLabel}</span> : null}
      </span>
      <strong>{getDisplayNodeLabel(node)}</strong>
      <div className="node-io">
        {getNodeIoLabel(node).map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </button>
  );
}

function getCanvasNodeClassName(selected: boolean, runState: NodeRunState) {
  return ["canvas-node", selected ? "selected" : "", runState === "running" ? "run-running" : ""].filter(Boolean).join(" ");
}

function getRunStateLabel(runState: NodeRunState) {
  if (runState === "running") return "运行中";
  return "";
}

function getDisplayNodeLabel(node: WorkbenchNode) {
  if (node.kind === "sequence" && node.order === 0) return "开始";
  if (node.kind === "return") return "返回结果";
  if (node.label === "Branch By Threshold") return "阈值分支";
  return node.label;
}
