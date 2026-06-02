export type UIDocument = {
  schemaVersion: string;
  workflowId: string;
  root: UINode;
  metadata?: Record<string, unknown>;
};

export type UINode = {
  id: string;
  kind: string;
  label?: string;
  path?: string;
  children?: UINode[];
  branches?: UIBranch[];
  layout?: UILayout;
  collapsed?: boolean;
  editable?: boolean;
  capabilities?: UICapabilities;
  inspector?: InspectorField[];
  validationSummary?: ValidationSummary;
  metadata?: Record<string, unknown>;
};

export type UIBranch = {
  id: string;
  label?: string;
  kind?: string;
  children?: UINode[];
};

export type UILayout = {
  direction?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  lane?: number;
};

export type UICapabilities = {
  toggleCollapsed?: UICapability;
  updateField?: UICapability;
  insertNode?: UICapability;
  deleteNode?: UICapability;
  moveStatement?: UICapability;
  duplicateNode?: UICapability;
  replaceSubtree?: UICapability;
};

export type UICapability = {
  enabled: boolean;
  label?: string;
  reason?: string;
  targetPath?: string;
  metadata?: Record<string, unknown>;
};

export type InspectorField = {
  path: string;
  label?: string;
  control?: string;
  value?: unknown;
  readonly?: boolean;
};

export type ValidationSummary = {
  errors?: number;
  warnings?: number;
};

export type EditOperation = {
  schemaVersion: string;
  operationId: string;
  type: string;
  targetNodeId?: string;
  path?: string;
  payload?: Record<string, unknown>;
  actor?: {
    id?: string;
    name?: string;
    kind?: string;
  };
  metadata?: Record<string, unknown>;
};
