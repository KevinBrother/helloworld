export type WorkflowNode = {
  id: string;
  kind: 'start' | 'if' | 'callBlock' | 'return';
  label: string;
  branch: string;
  path: string;
  problems: number;
  purpose: string;
  inputs: string[];
  parameters: Array<{
    name: string;
    type: 'number' | 'string' | 'boolean' | 'path';
    control: 'input' | 'select' | 'reference' | 'expression';
    value: string;
    options?: string[];
    source?: string;
  }>;
  outputs: Array<{
    name: string;
    type: 'number' | 'string' | 'boolean' | 'path';
    control?: 'input' | 'select' | 'reference' | 'expression';
    value?: string;
  }>;
};

export const workflowNodes: WorkflowNode[] = [
  {
    id: 'start',
    kind: 'start',
    label: 'Workflow Inputs',
    branch: 'root',
    path: '$.start',
    problems: 0,
    purpose: 'Define external inputs available as input.* references.',
    inputs: [],
    parameters: [
      { name: 'left', type: 'number', control: 'input', value: '12' },
      { name: 'operator', type: 'string', control: 'select', value: '+', options: ['+', '-', '*', '/'] },
      { name: 'right', type: 'number', control: 'input', value: '7' },
    ],
    outputs: [],
  },
  {
    id: 'branch_by_threshold',
    kind: 'if',
    label: 'Branch by threshold',
    branch: 'root',
    path: '$.body.statements[0]',
    problems: 0,
    purpose: 'Choose which calculation path runs based on a condition.',
    inputs: ['left', 'right'],
    parameters: [
      { name: 'left', type: 'number', control: 'reference', value: 'input.left', source: 'Start outputs' },
      { name: 'operator', type: 'string', control: 'select', value: '>', options: ['>', '>=', '<', '<=', '=='] },
      { name: 'right', type: 'number', control: 'input', value: '10' },
    ],
    outputs: [
      { name: 'then path', type: 'path' },
      { name: 'else path', type: 'path' },
    ],
  },
  {
    id: 'calculate_when_large',
    kind: 'callBlock',
    label: 'math.calculate',
    branch: 'then',
    path: '$.body.statements[0].then[0]',
    problems: 0,
    purpose: 'Call a reusable block when the branch condition is true.',
    inputs: ['left', 'operator', 'right'],
    parameters: [
      { name: 'left', type: 'number', control: 'reference', value: 'input.left', source: 'Start outputs' },
      { name: 'operator', type: 'string', control: 'select', value: '+', options: ['+', '-', '*', '/'] },
      { name: 'right', type: 'number', control: 'reference', value: 'input.right', source: 'Start outputs' },
    ],
    outputs: [
      { name: 'result', type: 'number' },
    ],
  },
  {
    id: 'calculate_default',
    kind: 'callBlock',
    label: 'math.calculate',
    branch: 'else',
    path: '$.body.statements[0].else[0]',
    problems: 0,
    purpose: 'Call the same block with alternate parameters when the branch is false.',
    inputs: ['left', 'operator', 'right'],
    parameters: [
      { name: 'left', type: 'number', control: 'reference', value: 'input.left', source: 'Start outputs' },
      { name: 'operator', type: 'string', control: 'select', value: '-', options: ['+', '-', '*', '/'] },
      { name: 'right', type: 'number', control: 'reference', value: 'input.right', source: 'Start outputs' },
    ],
    outputs: [
      { name: 'result', type: 'number' },
    ],
  },
  {
    id: 'return_result',
    kind: 'return',
    label: 'Return result',
    branch: 'root',
    path: '$.body.statements[1]',
    problems: 0,
    purpose: 'Select the final value returned by the workflow.',
    inputs: [],
    parameters: [],
    outputs: [
      { name: 'workflow result', type: 'number', control: 'reference', value: 'node.calculate_when_large.result' },
    ],
  },
];

export const nodeInsertOptions = [
  { label: 'Action', detail: 'Run a reusable step, such as calculate or click' },
  { label: 'Condition', detail: 'Split into then / else paths' },
  { label: 'Loop', detail: 'Repeat steps for each item' },
  { label: 'Return', detail: 'Choose the workflow result' },
];

export const blockCatalog = [
  { key: 'math.calculate', category: 'Computation', instances: 2, permissions: 'none', sideEffect: 'pure', manifest: 'valid' },
  { key: 'browser.click', category: 'Browser', instances: 0, permissions: 'browser', sideEffect: 'external interaction', manifest: 'available' },
  { key: 'file.read', category: 'File', instances: 0, permissions: 'filesystem read', sideEffect: 'external read', manifest: 'available' },
  { key: 'http.request', category: 'Network', instances: 0, permissions: 'network', sideEffect: 'external call', manifest: 'available' },
];

export const editOperations = [
  { status: 'saved', type: 'updateField', target: 'branch_by_threshold', path: '$.condition.right', detail: 'literal 10' },
  { status: 'local', type: 'toggleCollapsed', target: 'calculate_when_large', path: '$.metadata.collapsed', detail: 'collapsed false' },
];

export const parameterProblems = [
  { code: 'param.required', severity: 'warning', path: 'calculate_default.inputs.right', message: 'Required parameter needs a value or reference.' },
  { code: 'ref.scope', severity: 'info', path: 'return_result.result', message: 'Only previous node outputs can be selected.' },
];
