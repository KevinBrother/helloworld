import type { ReactNode } from 'react';
import { WireButton } from './WireButton';

type WireModalProps = {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function WireModal({ title, open, onClose, children }: WireModalProps) {
  if (!open) return null;

  return (
    <div className="wire-modal-backdrop" role="presentation">
      <section className="wire-modal" role="dialog" aria-modal="true" aria-label={title}>
        <h2>{title}</h2>
        <div>{children}</div>
        <div className="wire-modal-actions">
          <WireButton onClick={onClose}>Cancel</WireButton>
          <WireButton variant="primary" onClick={onClose}>Confirm</WireButton>
        </div>
      </section>
    </div>
  );
}
