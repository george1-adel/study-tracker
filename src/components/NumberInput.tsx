import { useId, type InputHTMLAttributes, type ReactNode } from 'react';

export interface NumberInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  error?: string;
}

export function NumberInput({ label, error, id: customId, className = '', ...props }: NumberInputProps) {
  const generatedId = useId();
  const id = customId || (label ? generatedId : undefined);

  return (
    <div className={`number-input-field ${className}`.trim()}>
      {label && (
        <label htmlFor={id} className="number-input-label">
          {label}
        </label>
      )}
      <input
        type="number"
        id={id}
        className={`number-input-control ${error ? 'number-input-error' : ''}`.trim()}
        {...props}
      />
      {error && <span className="input-error-msg">{error}</span>}
    </div>
  );
}
