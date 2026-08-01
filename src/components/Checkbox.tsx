import { useId, type InputHTMLAttributes, type ReactNode } from 'react';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode;
}

export function Checkbox({ label, id: customId, className = '', ...props }: CheckboxProps) {
  const generatedId = useId();
  const id = customId || generatedId;

  return (
    <div className={`checkbox-field ${className}`.trim()}>
      <input type="checkbox" id={id} className="checkbox-input" {...props} />
      <label htmlFor={id} className="checkbox-label">
        {label}
      </label>
    </div>
  );
}
