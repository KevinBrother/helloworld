import { type ReactNode } from "react";
import {
  getFieldSourceId,
  getResolvedFieldValue,
  getSourceOptions,
  type WorkbenchField,
  type WorkbenchModel,
  type WorkbenchNode,
} from "../../workbenchModel";
import { PanelHeading } from "./PanelHeading";
import { ValueComboInput } from "./ValueComboInput";

type ParameterPanelProps = {
  errors?: Record<string, string>;
  model: WorkbenchModel;
  node: WorkbenchNode;
  openSourceKey: string | null;
  onOpenSourceKeyChange: (key: string | null) => void;
  onFieldChange: (field: WorkbenchField, value: unknown) => void;
};

export function ParameterPanel({ errors = {}, model, node, openSourceKey, onOpenSourceKeyChange, onFieldChange }: ParameterPanelProps) {
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
            errors={errors}
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
  errors = {},
  model,
  node,
  openSourceKey,
  onFieldChange,
  onOpenSourceKeyChange,
}: {
  fields: WorkbenchField[];
  errors?: Record<string, string>;
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
          error={errors[field.key]}
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
  error,
  model,
  node,
  openSourceKey,
  onFieldChange,
  onOpenSourceKeyChange,
}: {
  field: WorkbenchField;
  error?: string;
  model: WorkbenchModel;
  node: WorkbenchNode;
  openSourceKey: string | null;
  onFieldChange: (field: WorkbenchField, value: unknown) => void;
  onOpenSourceKeyChange: (key: string | null) => void;
}) {
  const sourceKey = `${node.id}:${field.path}`;
  const sourceOptions = getSourceOptions(model.nodes, node.id, field);
  const resolvedValue = getResolvedFieldValue(field, model.sourcesById);
  const activeSourceId = getFieldSourceId(field);

  return (
    <div className="schema-row">
      <span className="field-name">{field.label}</span>
      <span className="field-meta">
        <code className={`field-type ${field.type}`}>{field.type}</code>
        {!field.readonly ? (
          <span aria-label="必填" className="required-mark">
            *
          </span>
        ) : null}
      </span>
      {field.readonly ? (
        <span className="value-control readonly-value">{resolvedValue}</span>
      ) : (
        <ValueComboInput
          activeSourceId={activeSourceId}
          error={error}
          field={field}
          isOpen={openSourceKey === sourceKey}
          resolvedValue={resolvedValue}
          sourceOptions={sourceOptions}
          onFieldChange={onFieldChange}
          onOpenChange={(nextOpen) => onOpenSourceKeyChange(nextOpen ? sourceKey : null)}
        />
      )}
    </div>
  );
}

function OutputDeclarationRow({ field }: { field: WorkbenchField }) {
  return (
    <div className="schema-row output-declaration">
      <span className="field-name">{field.label}</span>
      <span className="field-meta">
        <code className={`field-type ${field.type}`}>{field.type}</code>
      </span>
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
