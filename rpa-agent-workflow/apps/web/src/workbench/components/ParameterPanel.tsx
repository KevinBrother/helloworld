import { useEffect, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  getFieldSourceId,
  getResolvedFieldValue,
  getSourceOptions,
  type WorkbenchField,
  type WorkbenchModel,
  type WorkbenchNode,
  type WorkbenchParameterRow,
  type WorkbenchPort,
} from "../../workbenchModel";
import { ValueComboInput } from "./ValueComboInput";

type ParameterPanelProps = {
  errors?: Record<string, string>;
  model: WorkbenchModel;
  node: WorkbenchNode;
  openSourceKey: string | null;
  onOpenSourceKeyChange: (key: string | null) => void;
  onFieldChange: (field: WorkbenchField, value: unknown) => void;
  onWorkflowPortsChange: (direction: "inputs" | "outputs", ports: WorkbenchPort[]) => void;
  onDeleteNode?: (node: WorkbenchNode) => void;
};

export function ParameterPanel({
  errors = {},
  model,
  node,
  openSourceKey,
  onOpenSourceKeyChange,
  onFieldChange,
  onWorkflowPortsChange,
  onDeleteNode,
}: ParameterPanelProps) {
  const title = getDisplayNodeLabel(node);
  const showInputCard = node.inputRows.length > 0 || node.allowCustomInput;
  const showOutputCard = node.outputRows.length > 0 || node.allowCustomOutput;

  return (
    <aside className="panel parameter-panel">
      <div className="selected-node-summary">
        <div>
          <h2>{title}</h2>
          <span>{node.kind}</span>
        </div>
        <div className="selected-node-actions">
          {node.branch ? <b>{node.branch}</b> : null}
          {node.deletable ? (
            <button className="danger-icon-button" onClick={() => onDeleteNode?.(node)} title="删除节点" type="button">
              <Trash2 size={16} />
            </button>
          ) : null}
        </div>
      </div>

      {showInputCard ? (
        <ParameterCard
          addLabel="添加自定义参数"
          allowAdd={node.allowCustomInput}
          direction="inputs"
          errors={errors}
          model={model}
          node={node}
          openSourceKey={openSourceKey}
          rows={node.inputRows}
          title="输入参数"
          onFieldChange={onFieldChange}
          onOpenSourceKeyChange={onOpenSourceKeyChange}
          onWorkflowPortsChange={onWorkflowPortsChange}
        />
      ) : null}

      {showOutputCard ? (
        <ParameterCard
          addLabel="添加自定义输出"
          allowAdd={node.allowCustomOutput}
          direction="outputs"
          errors={errors}
          model={model}
          node={node}
          openSourceKey={openSourceKey}
          rows={node.outputRows}
          title="输出参数"
          onFieldChange={onFieldChange}
          onOpenSourceKeyChange={onOpenSourceKeyChange}
          onWorkflowPortsChange={onWorkflowPortsChange}
        />
      ) : null}

      {!showInputCard && !showOutputCard ? <div className="empty-state">该节点没有可配置字段。</div> : null}
    </aside>
  );
}

function ParameterCard({
  addLabel,
  allowAdd,
  direction,
  errors,
  model,
  node,
  openSourceKey,
  rows,
  title,
  onFieldChange,
  onOpenSourceKeyChange,
  onWorkflowPortsChange,
}: {
  addLabel: string;
  allowAdd: boolean;
  direction: "inputs" | "outputs";
  errors: Record<string, string>;
  model: WorkbenchModel;
  node: WorkbenchNode;
  openSourceKey: string | null;
  rows: WorkbenchParameterRow[];
  title: string;
  onFieldChange: (field: WorkbenchField, value: unknown) => void;
  onOpenSourceKeyChange: (key: string | null) => void;
  onWorkflowPortsChange: (direction: "inputs" | "outputs", ports: WorkbenchPort[]) => void;
}) {
  const [draftPorts, setDraftPorts] = useState(() => portsFromRows(rows));
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDraftPorts(portsFromRows(rows));
  }, [rows]);

  const commitPorts = (nextPorts: WorkbenchPort[], delay = 0) => {
    setDraftPorts(nextPorts);
    if (commitTimer.current) {
      clearTimeout(commitTimer.current);
      commitTimer.current = null;
    }
    if (delay > 0) {
      commitTimer.current = setTimeout(() => {
        onWorkflowPortsChange(direction, nextPorts);
        commitTimer.current = null;
      }, delay);
      return;
    }
    onWorkflowPortsChange(direction, nextPorts);
  };

  const updateRowPort = (row: WorkbenchParameterRow, value: WorkbenchPort["value"], delay = 0) => {
    if (!row.port) return;
    commitPorts(
      draftPorts.map((port) => (port.path === row.port?.path ? portFromValue(value, port.path) : port)),
      delay,
    );
  };

  const deleteRowPort = (row: WorkbenchParameterRow) => {
    if (!row.port) return;
    commitPorts(draftPorts.filter((port) => port.path !== row.port?.path));
  };

  return (
    <section className="parameter-card">
      <details open>
        <summary>
          <span>{title}</span>
          <small>{rows.length} 个</small>
        </summary>
        <div className="parameter-row-list">
          {rows.length > 0 ? (
            <div className="parameter-row-header" aria-hidden="true">
              <span>名称</span>
              <span>类型</span>
              <span>操作</span>
            </div>
          ) : null}
          {rows.map((row) => (
            <ParameterRow
              errors={errors}
              key={row.id}
              model={model}
              node={node}
              openSourceKey={openSourceKey}
              row={row}
              onDelete={() => deleteRowPort(row)}
              onFieldChange={onFieldChange}
              onNameChange={(name) => row.port && updateRowPort(row, { ...row.port.value, name }, 180)}
              onOpenSourceKeyChange={onOpenSourceKeyChange}
              onTypeChange={(type) => row.port && updateRowPort(row, { ...row.port.value, type: { name: type } })}
            />
          ))}
          {allowAdd ? (
            <button className="secondary-button parameter-add-button" onClick={() => commitPorts([...draftPorts, newPort(direction, draftPorts.length)])} type="button">
              <Plus size={15} />
              {addLabel}
            </button>
          ) : null}
        </div>
      </details>
    </section>
  );
}

function ParameterRow({
  errors,
  model,
  node,
  openSourceKey,
  row,
  onDelete,
  onFieldChange,
  onNameChange,
  onOpenSourceKeyChange,
  onTypeChange,
}: {
  errors: Record<string, string>;
  model: WorkbenchModel;
  node: WorkbenchNode;
  openSourceKey: string | null;
  row: WorkbenchParameterRow;
  onDelete: () => void;
  onFieldChange: (field: WorkbenchField, value: unknown) => void;
  onNameChange: (name: string) => void;
  onOpenSourceKeyChange: (key: string | null) => void;
  onTypeChange: (type: string) => void;
}) {
  const field = row.field;
  const valueField = field ? { ...field, key: row.name, label: row.name, type: row.type } : undefined;
  const sourceKey = `${node.id}:${row.valuePath ?? row.id}`;
  const error = field ? errors[field.key] : undefined;

  return (
    <div className="parameter-row">
      <input
        aria-label={`参数名 ${row.name}`}
        className="parameter-cell-input"
        disabled={!row.nameEditable}
        value={row.name}
        onChange={(event) => onNameChange(event.target.value)}
      />
      <select
        aria-label={`参数类型 ${row.name}`}
        className="parameter-cell-select"
        disabled={!row.typeEditable}
        value={row.type}
        onChange={(event) => onTypeChange(event.target.value)}
      >
        {PORT_TYPE_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {row.allowDelete ? (
        <button aria-label={`删除参数 ${row.name}`} className="danger-icon-button compact" onClick={onDelete} type="button">
          <Trash2 size={15} />
        </button>
      ) : (
        <span aria-hidden="true" />
      )}
      <div className="parameter-value-cell">
        {valueField && row.valueEditable ? (
          <ValueComboInput
            activeSourceId={getFieldSourceId(valueField)}
            error={error}
            field={valueField}
            isOpen={openSourceKey === sourceKey}
            resolvedValue={getResolvedFieldValue(valueField, model.sourcesById)}
            sourceOptions={row.allowReference ? getSourceOptions(model.nodes, node.id, valueField) : []}
            onFieldChange={onFieldChange}
            onOpenChange={(nextOpen) => onOpenSourceKeyChange(nextOpen ? sourceKey : null)}
          />
        ) : (
          <span className="value-control readonly-value">{field ? getResolvedFieldValue(field, model.sourcesById) : ""}</span>
        )}
      </div>
    </div>
  );
}

const PORT_TYPE_OPTIONS = ["string", "number", "boolean", "object", "array"];

function portsFromRows(rows: WorkbenchParameterRow[]) {
  return rows.flatMap((row) => (row.port ? [row.port] : []));
}

function newPort(direction: "inputs" | "outputs", index: number): WorkbenchPort {
  const name = `${direction === "inputs" ? "input" : "output"}${index + 1}`;
  return portFromValue({ name, type: { name: "string" } }, `$.${direction}.${name}`);
}

function portFromValue(value: WorkbenchPort["value"], fallbackPath: string): WorkbenchPort {
  const type = value.type.name as WorkbenchPort["type"];
  return {
    key: value.name,
    label: value.name,
    type,
    path: fallbackPath,
    value,
  };
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

function getDisplayNodeLabel(node: WorkbenchNode) {
  if (node.kind === "sequence" && node.order === 0) return "流程输入";
  if (node.kind === "return") return "返回结果";
  if (node.label === "Branch By Threshold") return "阈值分支";
  return node.label;
}
