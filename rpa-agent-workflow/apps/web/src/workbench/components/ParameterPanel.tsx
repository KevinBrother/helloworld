import { useEffect, useRef, useState, type ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  getFieldSourceId,
  getResolvedFieldValue,
  getSourceOptions,
  type WorkbenchField,
  type WorkbenchModel,
  type WorkbenchNode,
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
  const showWorkflowInputs = node.kind === "sequence" && node.order === 0;
  const showWorkflowOutputs = node.kind === "return";
  const showInputs = node.kind !== "return" && node.inputs.length > 0;
  const showOutputs = node.kind !== "sequence" && node.outputs.length > 0;

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

      {showWorkflowInputs ? (
        <SchemaSection title="流程输入">
          <WorkflowPortList
            addLabel="添加输入"
            direction="inputs"
            ports={node.inputPorts}
            onPortsChange={(ports) => onWorkflowPortsChange("inputs", ports)}
          />
        </SchemaSection>
      ) : null}

      {showInputs ? (
        <SchemaSection title={showWorkflowInputs ? "运行输入值" : "输入"}>
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

      {showWorkflowOutputs ? (
        <SchemaSection title="流程输出">
          <WorkflowPortList
            addLabel="添加输出"
            direction="outputs"
            ports={node.outputPorts}
            onPortsChange={(ports) => onWorkflowPortsChange("outputs", ports)}
          />
        </SchemaSection>
      ) : null}

      {showOutputs ? (
        <SchemaSection title={showWorkflowOutputs ? "返回值" : "输出"}>
          {showWorkflowOutputs ? (
            <ParameterFieldList
              fields={node.outputs}
              errors={errors}
              model={model}
              node={node}
              openSourceKey={openSourceKey}
              onFieldChange={onFieldChange}
              onOpenSourceKeyChange={onOpenSourceKeyChange}
            />
          ) : (
            node.outputs.map((field) => <OutputDeclarationRow field={field} key={field.path} />)
          )}
        </SchemaSection>
      ) : null}

      {!showWorkflowInputs && !showWorkflowOutputs && !showInputs && !showOutputs ? <div className="empty-state">该节点没有可配置字段。</div> : null}
    </aside>
  );
}

function WorkflowPortList({
  addLabel,
  direction,
  ports,
  onPortsChange,
}: {
  addLabel: string;
  direction: "inputs" | "outputs";
  ports: WorkbenchPort[];
  onPortsChange: (ports: WorkbenchPort[]) => void;
}) {
  const [draftPorts, setDraftPorts] = useState(ports);
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDraftPorts(ports);
  }, [ports]);

  const commitPorts = (nextPorts: WorkbenchPort[], delay = 0) => {
    setDraftPorts(nextPorts);
    if (commitTimer.current) {
      clearTimeout(commitTimer.current);
      commitTimer.current = null;
    }
    if (delay > 0) {
      commitTimer.current = setTimeout(() => {
        onPortsChange(nextPorts);
        commitTimer.current = null;
      }, delay);
      return;
    }
    onPortsChange(nextPorts);
  };

  return (
    <div className="workflow-port-list">
      {draftPorts.map((port, index) => (
        <div className="workflow-port-row" key={`${port.path}:${index}`}>
          <input
            aria-label={`参数名 ${index + 1}`}
            className="port-name-input"
            value={port.value.name}
            onChange={(event) => commitPorts(replacePort(draftPorts, index, { ...port.value, name: event.target.value }), 180)}
          />
          <select
            aria-label={`参数类型 ${index + 1}`}
            className="port-type-select"
            value={port.value.type.name}
            onChange={(event) => commitPorts(replacePort(draftPorts, index, { ...port.value, type: { name: event.target.value } }))}
          >
            {PORT_TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <button
            aria-label={`删除参数 ${port.key}`}
            className="danger-icon-button compact"
            onClick={() => commitPorts(draftPorts.filter((_, portIndex) => portIndex !== index))}
            type="button"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ))}
      <button className="secondary-button schema-add-button" onClick={() => commitPorts([...draftPorts, newPort(direction, draftPorts.length)])} type="button">
        <Plus size={15} />
        {addLabel}
      </button>
    </div>
  );
}

const PORT_TYPE_OPTIONS = ["string", "number", "boolean", "object", "array"];

function replacePort(ports: WorkbenchPort[], index: number, value: WorkbenchPort["value"]) {
  return ports.map((port, portIndex) => (portIndex === index ? portFromValue(value, port.path) : port));
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

function getDisplayNodeLabel(node: WorkbenchNode) {
  if (node.kind === "sequence" && node.order === 0) return "流程输入";
  if (node.kind === "return") return "返回结果";
  if (node.label === "Branch By Threshold") return "阈值分支";
  return node.label;
}
