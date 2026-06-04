import type { ButtonHTMLAttributes, ReactNode } from 'react';

type WireButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger';
  children: ReactNode;
};

export function WireButton({ variant = 'secondary', children, className = '', ...props }: WireButtonProps) {
  return (
    <button className={`wire-button wire-button-${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}
