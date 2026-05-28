export type UIDocument = {
  schemaVersion: string;
  workflowId: string;
  root: UINode;
  nodes?: UINode[];
  metadata?: Record<string, unknown>;
};

export type UINode = {
  id: string;
  kind: string;
  label?: string;
  path?: string;
  children?: UINode[];
  branches?: UIBranch[];
  ports?: UIPort[];
  layout?: UILayout;
  collapsed?: boolean;
  editable?: boolean;
  operations?: UIOperation[];
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

export type UIPort = {
  name: string;
  kind?: string;
  role?: string;
};

export type UILayout = {
  direction?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  lane?: number;
};

export type UIOperation = {
  type: string;
  label?: string;
  enabled?: boolean;
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
