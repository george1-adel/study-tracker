import { useId, type SelectHTMLAttributes, type ReactNode } from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode;
  options: SelectOption[];
}

export function Select({ label, options, id: customId, className = '', ...props }: SelectProps) {
  const generatedId = useId();
  const id = customId || (label ? generatedId : undefined);

  return (
    <div className={`select-field ${className}`.trim()}>
      {label && (
        <label htmlFor={id} className="select-label">
          {label}
        </label>
      )}
      <select id={id} className="select-control" {...props}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
