import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import {
  getFieldSourceId,
  getResolvedFieldValue,
  getSourceOptions,
  makeFieldValueFromSource,
  type WorkbenchField,
  type WorkbenchModel,
  type WorkbenchNode,
} from "../../workbenchModel";
import { PanelHeading } from "./PanelHeading";

type ParameterPanelProps = {
  model: WorkbenchModel;
  node: WorkbenchNode;
  openSourceKey: string | null;
  onOpenSourceKeyChange: (key: string | null) => void;
  onFieldChange: (field: WorkbenchField, value: unknown) => void;
};

export function ParameterPanel({ model, node, openSourceKey, onOpenSourceKeyChange, onFieldChange }: ParameterPanelProps) {
  const title = node.kind === "sequence" && node.order === 0 ? "Workflow Inputs" : node.kind === "return" ? "Return result" : node.label;
  const showInputs = node.kind !== "return" && node.inputs.length > 0;
  const showOutputs = node.kind !== "sequence" && node.outputs.length > 0;

  return (
    <aside className="panel parameter-panel">
      <PanelHeading title="Parameters" detail={node.path ?? node.id} />
      <div className="selected-node-summary">
        <div>
          <h2>{title}</h2>
          <span>{node.kind}</span>
        </div>
        {node.branch ? <b>{node.branch}</b> : null}
      </div>

      {showInputs ? (
        <SchemaSection title={node.kind === "sequence" ? "Workflow inputs" : "Inputs"}>
          {node.inputs.map((field) => (
            <FieldRow
              field={field}
              key={field.path}
              model={model}
              node={node}
              openSourceKey={openSourceKey}
              onFieldChange={onFieldChange}
              onOpenSourceKeyChange={onOpenSourceKeyChange}
            />
          ))}
        </SchemaSection>
      ) : null}

      {showOutputs ? (
        <SchemaSection title={node.kind === "return" ? "Workflow outputs" : "Outputs"}>
          {node.outputs.map((field) => (
            <OutputDeclarationRow field={field} key={field.path} />
          ))}
        </SchemaSection>
      ) : null}

      {!showInputs && !showOutputs ? <div className="empty-state">No configurable fields for this node.</div> : null}
    </aside>
  );
}

function FieldRow({
  field,
  model,
  node,
  openSourceKey,
  onFieldChange,
  onOpenSourceKeyChange,
}: {
  field: WorkbenchField;
  model: WorkbenchModel;
  node: WorkbenchNode;
  openSourceKey: string | null;
  onFieldChange: (field: WorkbenchField, value: unknown) => void;
  onOpenSourceKeyChange: (key: string | null) => void;
}) {
  const sourceKey = `${node.id}:${field.path}`;
  const sourceOptions = getSourceOptions(model.nodes, node.id, field);
  const canChooseSource = !field.readonly && field.type !== "unknown" && sourceOptions.length > 0;
  const resolvedValue = getResolvedFieldValue(field, model.sourcesById);
  const activeSourceId = getFieldSourceId(field);
  const activeSource = activeSourceId ? sourceOptions.find((source) => source.id === activeSourceId) : undefined;

  return (
    <div className="schema-row">
      <span className="field-name">{field.label}</span>
      <code className={`field-type ${field.type}`}>{field.type}</code>
      {field.options?.length ? (
        <select
          className="value-control"
          value={String(resolvedValue)}
          onChange={(event) => onFieldChange(field, { kind: "literal", value: event.target.value })}
        >
          {field.options.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      ) : field.readonly ? (
        <span className="value-control readonly-value">{resolvedValue}</span>
      ) : (
        <div className={activeSource ? "input-binding linked" : "input-binding"}>
          {activeSource ? <span className="binding-badge">ref</span> : null}
          <input
            className="value-control"
            value={String(resolvedValue)}
            onChange={(event) => onFieldChange(field, { kind: "literal", value: parseFieldInput(event.target.value, field.type) })}
          />
          {canChooseSource ? (
            <button className="source-picker-trigger" onClick={() => onOpenSourceKeyChange(openSourceKey === sourceKey ? null : sourceKey)}>
              {activeSource ? `${activeSource.nodeLabel}.${activeSource.output}` : "Use ref"}
              <ChevronDown size={14} />
            </button>
          ) : null}
        </div>
      )}

      {canChooseSource && openSourceKey === sourceKey ? (
        <div className="source-picker">
          {sourceOptions.map((source) => (
            <button
              className={activeSourceId === source.id ? "active" : ""}
              key={source.id}
              onClick={() => {
                onFieldChange(field, makeFieldValueFromSource(source.id));
                onOpenSourceKeyChange(null);
              }}
            >
              <span>{source.nodeLabel}</span>
              <strong>{source.output}</strong>
              <code>{source.type}</code>
              <em>{source.displayValue}</em>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function OutputDeclarationRow({ field }: { field: WorkbenchField }) {
  return (
    <div className="schema-row output-declaration">
      <span className="field-name">{field.label}</span>
      <code className={`field-type ${field.type}`}>{field.type}</code>
    </div>
  );
}

function SchemaSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="schema-section">
      <h3>{title}</h3>
      <div className="schema-box">
        <span className="brace">{"{"}</span>
        {children}
        <span className="brace">{"}"}</span>
      </div>
    </section>
  );
}

function parseFieldInput(value: string, type: WorkbenchField["type"]) {
  if (type === "number") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : value;
  }
  if (type === "boolean") return value === "true";
  return value;
}
