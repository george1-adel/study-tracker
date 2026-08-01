import { Ltr } from './Ltr';

export interface TapeScaleProps {
  zoom?: 'day' | 'month' | 'year';
  className?: string;
}

const DAY_HOURS = [0, 3, 6, 9, 12, 15, 18, 21, 24];

export function TapeScale({ zoom = 'day', className = '' }: TapeScaleProps) {
  if (zoom !== 'day') {
    return <div className={`tape-scale tape-scale-${zoom} ${className}`} />;
  }

  return (
    <div className={`tape-scale tape-scale-day ${className}`} aria-hidden="true">
      {DAY_HOURS.map((hour) => {
        const frac = hour / 24;
        const is3h = hour % 6 !== 0;
        const hourStr = String(hour).padStart(2, '0');
        const tickClass = is3h
          ? 'tape-scale-tick tape-scale-tick-3h'
          : 'tape-scale-tick tape-scale-tick-6h';

        let transformStyle = 'translateX(-50%)';
        if (hour === 0) {
          transformStyle = 'translateX(0)';
        } else if (hour === 24) {
          transformStyle = 'translateX(-100%)';
        }

        return (
          <div
            key={hour}
            className={tickClass}
            style={{
              insetInlineStart: `${frac * 100}%`,
              transform: transformStyle,
            }}
          >
            <span className="tape-scale-line" />
            <span className="tape-scale-label">
              <Ltr>{hourStr}</Ltr>
            </span>
          </div>
        );
      })}
    </div>
  );
}
