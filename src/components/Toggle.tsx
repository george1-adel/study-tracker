import { useId, type ReactNode } from 'react';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: ReactNode;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
}

export function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
  ariaLabel,
  className = '',
}: ToggleProps) {
  const generatedId = useId();
  const id = label ? generatedId : undefined;

  return (
    <div className={`toggle-field ${className}`.trim()}>
      <button
        type="button"
        role="switch"
        id={id}
        aria-checked={checked}
        aria-label={typeof label === 'string' ? label : ariaLabel}
        disabled={disabled}
        className={`toggle-control ${checked ? 'is-checked' : ''}`.trim()}
        onClick={() => !disabled && onChange(!checked)}
      >
        <span className="toggle-thumb" />
      </button>
      {label && (
        <label htmlFor={id} className="toggle-label" onClick={() => !disabled && onChange(!checked)}>
          {label}
        </label>
      )}
    </div>
  );
}
