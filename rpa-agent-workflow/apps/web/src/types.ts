export type UIDocument = {
  schemaVersion: string;
  workflowId: string;
  root: UINode;
  metadata?: Record<string, unknown>;
};

export type BlockType = {
  name: string;
  optional?: boolean;
  nullable?: boolean;
  enum?: string[];
  description?: string;
  items?: BlockType;
  properties?: Record<string, BlockType>;
  anyOf?: BlockType[];
};

export type BlockPort = {
  name: string;
  type: BlockType;
};

export type BlockDefinition = {
  schemaVersion?: string;
  id: string;
  namespace?: string;
  name?: string;
  version?: string;
  description?: string;
  inputs?: BlockPort[];
  outputs?: BlockPort[];
  display?: {
    label?: string;
    icon?: string;
    color?: string;
  };
  metadata?: Record<string, unknown>;
};

export type BlocksResponse = {
  blocks: BlockDefinition[];
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
  metadata?: Record<string, unknown>;
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

export type Diagnostic = {
  code?: string;
  severity?: string;
  message?: string;
  path?: string;
  related?: string;
  hint?: string;
};

export type EditorStateResponse = {
  ast: unknown;
  ui: UIDocument;
  diagnostics?: Diagnostic[];
  operation?: EditOperation;
};

export type RunResult = {
  inputs?: Record<string, unknown>;
  returns?: Record<string, unknown>;
  variables?: Record<string, unknown>;
  state?: Record<string, unknown>;
  nodeOutputs?: Record<string, Record<string, unknown>>;
  events?: Array<{
    name?: string;
    workflowId?: string;
    statementId?: string;
    statementKind?: string;
    payload?: Record<string, unknown>;
  }>;
};

export type RunResponse = {
  result?: RunResult;
  diagnostics?: Diagnostic[];
};

export type RunEvent = NonNullable<RunResult["events"]>[number] & {
  name?: string;
  statementId?: string;
};

export type RunStreamMessage =
  | {
      type: "trace";
      event: RunEvent;
    }
  | {
      type: "result";
      result?: RunResult;
      diagnostics?: Diagnostic[];
    }
  | {
      type: "error";
      event?: RunEvent;
      diagnostics?: Diagnostic[];
    };
