import type { WorkflowNode } from '../prototype-data/sampleData';

type WireTableProps = {
  records: WorkflowNode[];
  onSelect: (record: WorkflowNode) => void;
};

export function WireTable({ records, onSelect }: WireTableProps) {
  return (
    <table className="wire-table">
      <thead>
        <tr>
          <th>Node id</th>
          <th>Kind</th>
          <th>Label</th>
          <th>Branch</th>
          <th>AST path</th>
          <th>Problems</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {records.map((record) => (
          <tr key={record.id}>
            <td><code>{record.id}</code></td>
            <td><span className="wire-pill">{record.kind}</span></td>
            <td>{record.label}</td>
            <td>{record.branch}</td>
            <td><code>{record.path}</code></td>
            <td>{record.problems}</td>
            <td>
              <button className="wire-link" onClick={() => onSelect(record)}>Open inspector</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
