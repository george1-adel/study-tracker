import { useId, type InputHTMLAttributes, type ReactNode } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  error?: string;
}

export function Input({ label, error, id: customId, className = '', ...props }: InputProps) {
  const generatedId = useId();
  const id = customId || (label ? generatedId : undefined);

  return (
    <div className={`input-field ${className}`.trim()}>
      {label && (
        <label htmlFor={id} className="input-label">
          {label}
        </label>
      )}
      <input id={id} className={`input-control ${error ? 'input-error' : ''}`.trim()} {...props} />
      {error && <span className="input-error-msg">{error}</span>}
    </div>
  );
}
