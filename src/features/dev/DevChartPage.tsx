import { LineChartCard } from '../../components/charts/LineChartCard';
import { BarChartCard } from '../../components/charts/BarChartCard';
import { PieChartCard } from '../../components/charts/PieChartCard';
import { useT } from '../../i18n';

export function DevChartPage() {
  const t = useT();

  const lineData = [
    { day: 'Mon', focus: 120, break: 30 },
    { day: 'Tue', focus: 180, break: 45 },
    { day: 'Wed', focus: 90, break: 20 },
    { day: 'Thu', focus: 240, break: 60 },
    { day: 'Fri', focus: 150, break: 30 },
  ];

  const barData = [
    { day: 'Mon', focus: 2.0, break: 0.5 },
    { day: 'Tue', focus: 3.0, break: 0.75 },
    { day: 'Wed', focus: 1.5, break: 0.33 },
    { day: 'Thu', focus: 4.0, break: 1.0 },
    { day: 'Fri', focus: 2.5, break: 0.5 },
  ];

  const pieData = [
    { name: t('charts.focusTime'), value: 780, colorType: 'focus' as const },
    { name: t('charts.breakTime'), value: 185, colorType: 'break' as const },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ padding: '12px', backgroundColor: 'var(--ink-sunken)', border: '1px solid var(--rule)' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600 }}>{t('dev.title')}</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
          {t('dev.description')}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        <LineChartCard
          title={t('dev.lineTitle')}
          data={lineData}
          xKey="day"
          series={[
            { key: 'focus', name: t('charts.focusTime'), colorType: 'focus' },
            { key: 'break', name: t('charts.breakTime'), colorType: 'break' },
          ]}
          height={280}
        />

        <BarChartCard
          title={t('dev.barTitle')}
          data={barData}
          xKey="day"
          series={[
            { key: 'focus', name: t('charts.focusTime'), colorType: 'focus' },
            { key: 'break', name: t('charts.breakTime'), colorType: 'break' },
          ]}
          stacked
          height={280}
        />

        <PieChartCard
          title={t('dev.pieTitle')}
          data={pieData}
          height={280}
        />

        <LineChartCard
          title={t('dev.emptyTitle')}
          data={[]}
          xKey="day"
          series={[]}
          height={280}
        />
      </div>
    </div>
  );
}
