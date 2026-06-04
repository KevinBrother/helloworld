import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { WireButton } from './WireButton';

type WireDrawerProps = {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function WireDrawer({ title, open, onClose, children }: WireDrawerProps) {
  if (!open) return null;

  return (
    <aside className="wire-drawer" aria-label={title}>
      <div className="wire-drawer-header">
        <h2>{title}</h2>
        <button className="wire-icon-button" onClick={onClose} aria-label="Close drawer">
          <X size={18} />
        </button>
      </div>
      <div className="wire-drawer-body">{children}</div>
      <div className="wire-drawer-footer">
        <WireButton>Secondary action</WireButton>
        <WireButton variant="primary">Primary action</WireButton>
      </div>
    </aside>
  );
}
