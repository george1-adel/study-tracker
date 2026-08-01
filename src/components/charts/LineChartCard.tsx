import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Card } from '../Card';
import { EmptyState } from '../EmptyState';
import { useT } from '../../i18n';
import { getSeriesColor } from './chartUtils';

export interface LineChartSeries {
  key: string;
  name: string;
  colorType?: 'focus' | 'break' | 'neutral';
  color?: string;
}

export interface LineChartCardProps {
  title?: string;
  data?: Array<Record<string, unknown>>;
  xKey: string;
  series: LineChartSeries[];
  height?: number | string;
  emptyText?: string;
  formatY?: (value: number) => string;
  formatX?: (value: string | number) => string;
  formatTooltipValue?: (value: number, name: string) => string;
  className?: string;
}

export function LineChartCard({
  title,
  data = [],
  xKey,
  series,
  height = 300,
  emptyText,
  formatY,
  formatX,
  formatTooltipValue,
  className = '',
}: LineChartCardProps) {
  const t = useT();

  const isEmpty = !data || data.length === 0;

  if (isEmpty) {
    return (
      <Card className={`chart-card ${className}`.trim()}>
        {title && <h3 className="chart-card-title">{title}</h3>}
        <EmptyState title={emptyText || t('charts.empty')} />
      </Card>
    );
  }

  const heightStyle = typeof height === 'number' ? `${height}px` : height;

  return (
    <Card className={`chart-card ${className}`.trim()}>
      {title && <h3 className="chart-card-title">{title}</h3>}
      <div
        className="chart-container"
        style={{ width: '100%', height: heightStyle }}
        dir="ltr"
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--rule)" />
            <XAxis
              dataKey={xKey}
              stroke="var(--text-muted)"
              tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
              tickFormatter={formatX ? (val: unknown) => formatX(val as string | number) : undefined}
            />
            <YAxis
              stroke="var(--text-muted)"
              tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
              tickFormatter={formatY}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--ink-raised)',
                borderColor: 'var(--rule)',
                color: 'var(--text)',
                borderRadius: 'var(--radius)',
              }}
              formatter={(value, name) => [
                formatTooltipValue ? formatTooltipValue(Number(value), String(name)) : value,
                name,
              ]}
            />
            <Legend
              wrapperStyle={{ color: 'var(--text-muted)', fontSize: 12 }}
            />
            {series.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name}
                stroke={getSeriesColor(s.colorType, s.color)}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
