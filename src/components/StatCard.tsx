import { Ltr } from './Ltr';

export interface StatCardProps {
  label: string;
  value: string | number | null | undefined;
  unit?: string;
}

export function StatCard({ label, value, unit }: StatCardProps) {
  let displayValue: string;

  if (value === null || value === undefined) {
    displayValue = '—';
  } else if (typeof value === 'number' && isNaN(value)) {
    displayValue = '—';
  } else {
    displayValue = String(value);
    if (displayValue === 'NaN') {
      displayValue = '—';
    }
  }

  return (
    <div className="stat-card">
      <span className="stat-card-label">{label}</span>
      <div className="stat-card-value-container">
        {displayValue === '—' ? (
          <span className="stat-card-value stat-card-value-mono">—</span>
        ) : (
          <Ltr className="stat-card-value stat-card-value-mono">
            {displayValue}
            {unit && <span className="stat-card-unit">{unit}</span>}
          </Ltr>
        )}
      </div>
    </div>
  );
}
