import { useState, type Dispatch, type SetStateAction } from 'react';
import { ChevronDown, ChevronUp, Play, Search } from 'lucide-react';
import { nodeInsertOptions, workflowNodes, type WorkflowNode } from '../prototype-data/sampleData';
import { WireButton } from '../components/WireButton';
import { WireField } from '../components/WireField';
import { WireModal } from '../components/WireModal';

export function DashboardPage() {
  const [selectedNode, setSelectedNode] = useState<WorkflowNode>(workflowNodes[1]);
  const [runOpen, setRunOpen] = useState(false);
  const [runLogOpen, setRunLogOpen] = useState(true);
  const [chosenSources, setChosenSources] = useState<Record<string, string>>({});
  const [openSourceKey, setOpenSourceKey] = useState<string | null>(null);

  return (
    <div className="page-stack">
      <section className="editor-toolbar wire-section">
        <div className="button-row">
          <WireButton>Save workflow</WireButton>
          <WireButton variant="primary" onClick={() => setRunOpen(true)}><Play size={16} /> Test run</WireButton>
        </div>
      </section>

      <section className="workflow-editor-grid">
        <aside className="wire-section node-palette">
          <div className="toolbar-input"><Search size={16} /> Search block or control node</div>
          <div className="wire-list">
            {nodeInsertOptions.map((option) => (
              <button className="wire-row-button" key={option.label}>
                <strong>{option.label}</strong>
                <span>{option.detail}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="wire-section canvas-panel">
          <div className="flow-board editor-canvas">
            <CanvasNode node={workflowNodes[0]} selected={selectedNode.id === workflowNodes[0].id} onSelect={setSelectedNode} />
            <div className="flow-line" />
            <CanvasNode node={workflowNodes[1]} selected={selectedNode.id === workflowNodes[1].id} onSelect={setSelectedNode} wide />
            <div className="branch-grid">
              <div className="branch-column">
                <span className="branch-label">then</span>
                <CanvasNode node={workflowNodes[2]} selected={selectedNode.id === workflowNodes[2].id} onSelect={setSelectedNode} />
              </div>
              <div className="branch-column">
                <span className="branch-label">else</span>
                <CanvasNode node={workflowNodes[3]} selected={selectedNode.id === workflowNodes[3].id} onSelect={setSelectedNode} />
              </div>
            </div>
            <div className="flow-line" />
            <CanvasNode node={workflowNodes[4]} selected={selectedNode.id === workflowNodes[4].id} onSelect={setSelectedNode} />
          </div>
        </section>

        <aside className="wire-section node-inspector">
          <div className="section-heading compact">
            <h3>{selectedNode.label}</h3>
            <span className="wire-pill">{nodeKindLabel(selectedNode.kind)}</span>
          </div>

          {selectedNode.kind !== 'return' ? (
            <section className="schema-panel">
              <h4>Inputs</h4>
              <div className="schema-box">
                <span className="brace">{'{'}</span>
                {selectedNode.parameters.map((param) => (
                  <SchemaValueRow
                    field={param}
                    key={param.name}
                    node={selectedNode}
                    openSourceKey={openSourceKey}
                    selectedSourceId={chosenSources[`input:${selectedNode.id}:${param.name}`]}
                    setChosenSources={setChosenSources}
                    setOpenSourceKey={setOpenSourceKey}
                    sourceKey={`input:${selectedNode.id}:${param.name}`}
                  />
                ))}
                <span className="brace">{'}'}</span>
              </div>
            </section>
          ) : null}

          {selectedNode.kind !== 'start' ? (
            <section className="schema-panel">
            <h4>Outputs</h4>
            <div className="schema-box">
              <span className="brace">{'{'}</span>
              {selectedNode.outputs.map((output) =>
                output.control === 'reference' ? (
                  <SchemaValueRow
                    field={output}
                    key={output.name}
                    node={selectedNode}
                    openSourceKey={openSourceKey}
                    selectedSourceId={chosenSources[`output:${selectedNode.id}:${output.name}`]}
                    setChosenSources={setChosenSources}
                    setOpenSourceKey={setOpenSourceKey}
                    sourceKey={`output:${selectedNode.id}:${output.name}`}
                  />
                ) : (
                  <div className="schema-row output-row" key={output.name}>
                    <span className="field-name">{output.name}:</span>
                    <span className={`field-type ${output.type}`}>{output.type}</span>
                  </div>
                ),
              )}
              <span className="brace">{'}'}</span>
            </div>
            </section>
          ) : null}
        </aside>
      </section>

      <WireModal title="Test run workflow" open={runOpen} onClose={() => setRunOpen(false)}>
        <div className="drawer-grid">
          <p>Run is only for checking whether the edited workflow behaves as expected.</p>
          <WireField label="left" value="12" />
          <WireField label="operator" value="+" />
          <WireField label="right" value="7" />
          <div className="wire-placeholder">Test result preview: workflow result = 19</div>
        </div>
      </WireModal>

      <section className={`run-log wire-section ${runLogOpen ? 'open' : 'collapsed'}`}>
        <div className="run-log-header">
          <code>Run output</code>
          <button className="wire-icon-button" onClick={() => setRunLogOpen((open) => !open)} aria-label="Toggle run log">
            {runLogOpen ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
        </div>
        {runLogOpen ? (
          <div className="run-log-body">
            <code>[10:42:01] test run started: calculator</code>
            <code>[10:42:01] left = 12, operator = +, right = 7</code>
            <code>[10:42:01] condition selected then path</code>
            <code>[10:42:01] math.calculate result = 19</code>
            <code>[10:42:01] workflow result = 19</code>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function CanvasNode({
  node,
  selected,
  wide = false,
  onSelect,
}: {
  node: WorkflowNode;
  selected: boolean;
  wide?: boolean;
  onSelect: (node: WorkflowNode) => void;
}) {
  const ioLabel = nodeIoLabel(node);

  return (
    <button className={`flow-node ${wide ? 'wide' : ''} ${selected ? 'selected' : ''}`} onClick={() => onSelect(node)}>
      <strong>{node.label}</strong>
      <div className="node-io">
        {ioLabel.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </button>
  );
}

type SchemaField = {
  name: string;
  type: WorkflowNode['parameters'][number]['type'];
  control?: WorkflowNode['parameters'][number]['control'];
  value?: string;
  options?: string[];
};

function SchemaValueRow({
  field,
  node,
  openSourceKey,
  selectedSourceId,
  setChosenSources,
  setOpenSourceKey,
  sourceKey,
}: {
  field: SchemaField;
  node: WorkflowNode;
  openSourceKey: string | null;
  selectedSourceId?: string;
  setChosenSources: Dispatch<SetStateAction<Record<string, string>>>;
  setOpenSourceKey: Dispatch<SetStateAction<string | null>>;
  sourceKey: string;
}) {
  const fieldValue = field.value ?? '';
  const sourceOptions = availableSources(node, field.type);
  const currentSourceId = selectedSourceId ?? sourceIdFromValue(fieldValue);
  const currentSource = sourceOptions.find((source) => source.value === currentSourceId);
  const currentValue = currentSource?.result ?? fieldValue;
  const sourceOpen = openSourceKey === sourceKey;
  const canPickSource = field.control === 'reference' || (field.control === 'input' && sourceOptions.length > 0);

  return (
    <div className="schema-row" key={field.name}>
      <span className="field-name">{field.name}:</span>
      <span className={`field-type ${field.type}`}>{field.type}</span>
      {field.control === 'select' ? (
        <select className="value-control" value={fieldValue} onChange={() => undefined}>
          {(field.options ?? [fieldValue]).map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      ) : canPickSource ? (
        <button
          className={`value-control source-value ${sourceOpen ? 'open' : ''} ${currentSource ? 'linked' : ''}`}
          onClick={() => setOpenSourceKey((current) => (current === sourceKey ? null : sourceKey))}
        >
          {currentValue}
        </button>
      ) : (
        <input className="value-control" value={currentValue} readOnly />
      )}
      {canPickSource && sourceOpen ? (
        <div className="source-picker">
          {sourceOptions.map((source) => (
            <button
              className={source.value === currentSourceId ? 'active' : ''}
              key={`${field.name}-${source.value}`}
              onClick={() => {
                setChosenSources((current) => ({ ...current, [sourceKey]: source.value }));
                setOpenSourceKey(null);
              }}
            >
              <span>{source.node}</span>
              <strong>{source.output}</strong>
              <code className={`source-type ${source.type}`}>{source.type}</code>
              <code className="source-result">{source.result}</code>
            </button>
          ))}
          {sourceOptions.length === 0 ? <div className="source-empty">No {field.type} output</div> : null}
        </div>
      ) : null}
    </div>
  );
}

type SourceOption = {
  node: string;
  output: string;
  value: string;
  type: WorkflowNode['outputs'][number]['type'];
  result: string;
};

function availableSources(node: WorkflowNode, expectedType: WorkflowNode['parameters'][number]['type']) {
  const sources: SourceOption[] =
    node.kind === 'return'
      ? [
          { node: 'math.calculate / then', output: 'result', value: 'node.calculate_when_large.result', type: 'number', result: '19' },
          { node: 'math.calculate / else', output: 'result', value: 'node.calculate_default.result', type: 'number', result: '5' },
        ]
      : [
          { node: 'Workflow Inputs', output: 'left', value: 'input.left', type: 'number', result: '12' },
          { node: 'Workflow Inputs', output: 'operator', value: 'input.operator', type: 'string', result: '+' },
          { node: 'Workflow Inputs', output: 'right', value: 'input.right', type: 'number', result: '7' },
        ];

  if (node.kind === 'start') {
    return [];
  }

  return sources.filter((source) => source.type === expectedType);
}

function nodeIoLabel(node: WorkflowNode) {
  if (node.kind === 'start') return [`${node.parameters.length} workflow inputs`];
  if (node.kind === 'return') return [`${node.outputs.length} workflow output`];
  return [`${node.inputs.length} inputs`, `${node.outputs.length} outputs`];
}

function sourceIdFromValue(value: string) {
  if (value.startsWith('input.')) return value;
  if (value.startsWith('node.')) return value;
  return null;
}

function nodeKindLabel(kind: WorkflowNode['kind']) {
  if (kind === 'callBlock') return 'Block';
  if (kind === 'if') return 'Condition';
  if (kind === 'start') return 'Inputs';
  return 'Return';
}
