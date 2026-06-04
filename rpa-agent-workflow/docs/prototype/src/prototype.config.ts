export type PrototypePage = {
  id: string;
  label: string;
  purpose: string;
};

export const prototypeConfig = {
  productName: 'Workflow Workbench',
  subtitle: 'Workflow editing low-fi prototype',
  roles: [],
  pages: [
    { id: 'dashboard', label: 'Workbench', purpose: 'Configure workflow nodes on one canvas' },
  ] satisfies PrototypePage[],
};
