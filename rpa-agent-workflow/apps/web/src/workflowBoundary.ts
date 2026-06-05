import type { UIDocument, UINode } from "./types";
import type { WorkbenchPort } from "./workbenchModel";

export function updateWorkflowPortsInDocument(
  document: UIDocument,
  direction: "inputs" | "outputs",
  ports: WorkbenchPort[],
  targetNodeId: string,
  previousPorts: WorkbenchPort[],
): UIDocument {
  const nextRoot =
    direction === "inputs"
      ? {
          ...document.root,
          inspector: replacePortInspectorFields(document.root.inspector, direction, ports),
        }
      : updateNodeRecursive(document.root, targetNodeId, (node) => {
          const inspector = replacePortInspectorFields(node.inspector, direction, ports);
          return {
            ...node,
            inspector: syncReturnInspectorFields(inspector, node, ports, previousPorts),
          };
        });

  const nextDocument = {
    ...document,
    root: nextRoot,
  };

  if (direction !== "inputs") return nextDocument;

  return {
    ...nextDocument,
    metadata: {
      ...nextDocument.metadata,
      workflowInputValues: remapWorkflowInputValues(workflowInputValues(document), previousPorts, ports),
    },
  };
}

function replacePortInspectorFields(inspector: UINode["inspector"], direction: "inputs" | "outputs", ports: WorkbenchPort[]) {
  const prefix = `$.${direction}.`;
  return [
    ...(inspector ?? []).filter((field) => !(field.control === "port" && field.path.startsWith(prefix))),
    ...ports.map((port) => ({
      path: `${prefix}${port.value.name}`,
      label: `${direction === "inputs" ? "Input" : "Output"} ${port.value.name}`,
      control: "port",
      value: port.value,
      readonly: true,
    })),
  ];
}

function syncReturnInspectorFields(
  inspector: UINode["inspector"],
  node: UINode,
  ports: WorkbenchPort[],
  previousPorts: WorkbenchPort[],
) {
  if (node.kind !== "return" || !node.path) return inspector;

  const existingReturns = new Map(
    (node.inspector ?? [])
      .filter((field) => field.path.includes(".returns."))
      .map((field) => [field.path.split(".").at(-1) ?? "", field]),
  );
  const nextReturnFields = ports.map((port, index) => {
    const previous = previousPorts[index];
    const preserved = existingReturns.get(port.key) ?? (previous ? existingReturns.get(previous.key) : undefined);
    return {
      path: `${node.path}.returns.${port.value.name}`,
      label: `Return ${port.value.name}`,
      control: "expression",
      value: preserved?.value ?? { kind: "literal", value: "" },
      metadata: preserved?.metadata,
    };
  });

  return [...(inspector ?? []).filter((field) => !field.path.includes(".returns.")), ...nextReturnFields];
}

function remapWorkflowInputValues(values: Record<string, unknown>, previousPorts: WorkbenchPort[], nextPorts: WorkbenchPort[]) {
  const nextValues: Record<string, unknown> = {};
  for (const [index, port] of nextPorts.entries()) {
    const previous = previousPorts[index];
    if (Object.hasOwn(values, port.key)) {
      nextValues[port.key] = values[port.key];
    } else if (previous && Object.hasOwn(values, previous.key)) {
      nextValues[port.key] = values[previous.key];
    }
  }
  return nextValues;
}

function workflowInputValues(document: UIDocument) {
  const value = document.metadata?.workflowInputValues;
  return isRecord(value) ? value : {};
}

function updateNodeRecursive(node: UINode, id: string, update: (node: UINode) => UINode): UINode {
  const nextNode = node.id === id ? update(node) : node;
  return {
    ...nextNode,
    children: nextNode.children?.map((child) => updateNodeRecursive(child, id, update)),
    branches: nextNode.branches?.map((branch) => ({
      ...branch,
      children: branch.children?.map((child) => updateNodeRecursive(child, id, update)),
    })),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
