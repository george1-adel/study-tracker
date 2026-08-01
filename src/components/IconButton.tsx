import type { ButtonHTMLAttributes, ReactNode } from 'react';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  'aria-label': string;
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
}

export function IconButton({
  'aria-label': ariaLabel,
  children,
  className = '',
  variant = 'ghost',
  type = 'button',
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={ariaLabel}
      className={`icon-btn icon-btn-${variant} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}
