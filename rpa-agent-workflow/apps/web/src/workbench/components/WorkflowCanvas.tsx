import type { NodeRunState, NodeRunStateMap } from "../../runEvents";
import { buildCanvasTopology, getNodeIoLabel, type WorkbenchModel, type WorkbenchNode } from "../../workbenchModel";
import { PanelHeading } from "./PanelHeading";

type WorkflowCanvasProps = {
  model: WorkbenchModel;
  nodeRunStates: NodeRunStateMap;
  selectedId: string;
  onSelect: (id: string) => void;
};

export function WorkflowCanvas({ model, nodeRunStates, selectedId, onSelect }: WorkflowCanvasProps) {
  const topology = buildCanvasTopology(model);

  return (
    <section className="panel canvas-panel">
      <PanelHeading title="Canvas" detail="Select a node to configure it" />
      <div className="canvas-scroll">
        <div className="workflow-diagram" aria-label="Workflow canvas">
          <svg className="workflow-links" viewBox="0 0 980 700" preserveAspectRatio="none" aria-hidden="true">
            <path className="flow-link primary" d="M490 114 L490 190" />
            <path className="flow-link primary" d="M490 286 L490 352 L190 352 L190 410" />
            <path className="flow-link primary" d="M490 286 L490 352 L790 352 L790 410" />
            <path className="flow-link primary" d="M190 506 L190 574 L490 574 L490 620" />
            <path className="flow-link primary" d="M790 506 L790 574 L490 574 L490 620" />
          </svg>

          <div className="diagram-slot start-slot">
            {topology.start ? (
              <CanvasNode node={topology.start} runState={nodeRunStates[topology.start.id] ?? "idle"} selected={selectedId === topology.start.id} onSelect={onSelect} />
            ) : null}
          </div>
          <div className="diagram-slot decision-slot">
            {topology.decision ? (
              <CanvasNode node={topology.decision} runState={nodeRunStates[topology.decision.id] ?? "idle"} selected={selectedId === topology.decision.id} onSelect={onSelect} />
            ) : null}
          </div>

          <div className="diagram-slot then-slot">
            {topology.thenNodes.map((node) => (
              <CanvasNode node={node} key={node.id} runState={nodeRunStates[node.id] ?? "idle"} selected={selectedId === node.id} onSelect={onSelect} />
            ))}
          </div>
          <div className="diagram-slot else-slot">
            {topology.elseNodes.map((node) => (
              <CanvasNode node={node} key={node.id} runState={nodeRunStates[node.id] ?? "idle"} selected={selectedId === node.id} onSelect={onSelect} />
            ))}
          </div>

          <div className="diagram-slot return-slot">
            {topology.returnNode ? (
              <CanvasNode
                node={topology.returnNode}
                runState={nodeRunStates[topology.returnNode.id] ?? "idle"}
                selected={selectedId === topology.returnNode.id}
                onSelect={onSelect}
              />
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function CanvasNode({ node, runState, selected, onSelect }: { node?: WorkbenchNode; runState: NodeRunState; selected: boolean; onSelect: (id: string) => void }) {
  if (!node) return null;
  const stateLabel = getRunStateLabel(runState);

  return (
    <button className={getCanvasNodeClassName(selected, runState)} onClick={() => onSelect(node.id)}>
      <span className="node-kind-row">
        <span className="node-kind">{node.kind === "sequence" && node.order === 0 ? "Workflow Inputs" : node.kind}</span>
        {stateLabel ? <span className={`node-run-indicator ${runState}`}>{stateLabel}</span> : null}
      </span>
      <strong>{node.kind === "return" ? "Return result" : node.label}</strong>
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
  if (runState === "running") return "Running";
  return "";
}
