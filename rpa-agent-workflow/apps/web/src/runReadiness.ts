import {
  getFieldSourceId,
  getSourceOptions,
  type WorkbenchField,
  type WorkbenchModel,
  type WorkbenchNode,
} from "./workbenchModel";

export type RunRepair = {
  field: WorkbenchField;
  fieldPath: string;
  node: WorkbenchNode;
  nodeId: string;
  value: { kind: "literal"; value: string };
};

export function findInvalidConditionOperatorRepairs(model: WorkbenchModel): RunRepair[] {
  const repairs: RunRepair[] = [];

  for (const node of model.nodes) {
    if (node.kind !== "if") continue;
    const operatorField = node.inputs.find((field) => field.key === "operator" && field.path.endsWith(".condition.operator"));
    if (!operatorField) continue;

    const sourceId = getFieldSourceId(operatorField);
    if (!sourceId) continue;

    const compatibleSourceIds = new Set(getSourceOptions(model.nodes, node.id, operatorField).map((source) => source.id));
    if (compatibleSourceIds.has(sourceId)) continue;

    repairs.push({
      field: operatorField,
      fieldPath: operatorField.path,
      node,
      nodeId: node.id,
      value: { kind: "literal", value: ">" },
    });
  }

  return repairs;
}
