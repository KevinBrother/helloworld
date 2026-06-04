import { ChevronDown } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
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
          <ParameterFieldList
            fields={node.inputs}
            model={model}
            node={node}
            openSourceKey={openSourceKey}
            onFieldChange={onFieldChange}
            onOpenSourceKeyChange={onOpenSourceKeyChange}
          />
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

export function ParameterFieldList({
  fields,
  model,
  node,
  openSourceKey,
  onFieldChange,
  onOpenSourceKeyChange,
}: {
  fields: WorkbenchField[];
  model: WorkbenchModel;
  node: WorkbenchNode;
  openSourceKey: string | null;
  onFieldChange: (field: WorkbenchField, value: unknown) => void;
  onOpenSourceKeyChange: (key: string | null) => void;
}) {
  return (
    <>
      {fields.map((field) => (
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
    </>
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
  const sourceLabel = activeSource ? `${activeSource.nodeLabel}.${activeSource.output}` : activeSourceId;
  const optionListId = field.options?.length ? `field-options-${sourceKey.replace(/[^a-zA-Z0-9_-]/g, "-")}` : undefined;
  const [draftValue, setDraftValue] = useState<string | null>(null);
  const displayValue = draftValue ?? String(resolvedValue);

  useEffect(() => {
    setDraftValue(null);
  }, [field.path, field.value]);

  return (
    <div className="schema-row">
      <span className="field-name">{field.label}</span>
      <code className={`field-type ${field.type}`}>{field.type}</code>
      {field.readonly ? (
        <span className="value-control readonly-value">{resolvedValue}</span>
      ) : (
        <div className={activeSourceId ? "value-editor linked" : "value-editor"}>
          {activeSourceId ? <span className="binding-badge">ref</span> : null}
          {field.options?.length ? (
            <>
              <input
                className="value-control"
                list={optionListId}
                value={displayValue}
                onChange={(event) => {
                  setDraftValue(event.target.value);
                  onFieldChange(field, { kind: "literal", value: event.target.value });
                  onOpenSourceKeyChange(null);
                }}
              />
              <datalist id={optionListId}>
                {field.options.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </datalist>
            </>
          ) : (
            <input
              className="value-control"
              value={displayValue}
              onChange={(event) => {
                setDraftValue(event.target.value);
                onFieldChange(field, { kind: "literal", value: parseFieldInput(event.target.value, field.type) });
                onOpenSourceKeyChange(null);
              }}
            />
          )}
          {canChooseSource ? (
            <button
              aria-label={sourceLabel ? `Change reference ${sourceLabel}` : "Use reference"}
              className={activeSourceId ? "source-picker-trigger active" : "source-picker-trigger"}
              onClick={() => onOpenSourceKeyChange(openSourceKey === sourceKey ? null : sourceKey)}
              title={sourceLabel ?? "Use ref"}
            >
              {sourceLabel ?? "Use ref"}
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
