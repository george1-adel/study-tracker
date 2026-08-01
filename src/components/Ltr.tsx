import type { ReactNode } from 'react';

export interface LtrProps {
  children: ReactNode;
  className?: string;
}

export function Ltr({ children, className = '' }: LtrProps) {
  return (
    <span dir="ltr" className={`ltr ${className}`.trim()} style={{ unicodeBidi: 'isolate' }}>
      {children}
    </span>
  );
}
