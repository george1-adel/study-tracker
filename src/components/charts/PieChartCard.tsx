import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { Card } from '../Card';
import { EmptyState } from '../EmptyState';
import { useT } from '../../i18n';
import { getSeriesColor } from './chartUtils';

export interface PieChartItem {
  name: string;
  value: number;
  colorType?: 'focus' | 'break' | 'neutral';
  color?: string;
}

export interface PieChartCardProps {
  title?: string;
  data?: PieChartItem[];
  height?: number | string;
  emptyText?: string;
  formatValue?: (value: number) => string;
  className?: string;
}

function isInvalidValue(v?: number): boolean {
  if (!v) return true;
  return v <= 0;
}

export function PieChartCard({
  title,
  data = [],
  height = 300,
  emptyText,
  formatValue,
  className = '',
}: PieChartCardProps) {
  const t = useT();

  const isEmpty = !data || data.length === 0 || data.every((d) => isInvalidValue(d.value));

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
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius="80%"
              dataKey="value"
              nameKey="name"
              isAnimationActive={false}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getSeriesColor(entry.colorType, entry.color)}
                  stroke="var(--rule)"
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--ink-raised)',
                borderColor: 'var(--rule)',
                color: 'var(--text)',
                borderRadius: 'var(--radius)',
              }}
              formatter={(value, name) => [
                formatValue ? formatValue(Number(value)) : value,
                name,
              ]}
            />
            <Legend wrapperStyle={{ color: 'var(--text-muted)', fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
