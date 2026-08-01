import type { Task, Session, Settings } from '../../domain/types';
import { getDayRecord } from '../../domain/stats/dayRecords';
import { completedTaskCount, incompleteTaskCount, totalFocusMs } from '../../domain/stats/totals';
import { dayKeyFromTimestamp, enumerateDays, addDays, weekdayIndex } from '../../domain/time/dayKey';
import { formatDuration, formatDayLabel } from '../../domain/time/format';
import { isFocusKind } from '../../domain/types';
import { useT, type Language } from '../../i18n';
import { LineChartCard } from '../../components/charts/LineChartCard';
import { BarChartCard } from '../../components/charts/BarChartCard';
import { PieChartCard, type PieChartItem } from '../../components/charts/PieChartCard';

export interface AnalyticsChartsProps {
  tasks: Task[];
  sessions: Session[];
  settings: Settings;
  now: number;
  locale: Language;
}

export function AnalyticsCharts({ tasks, sessions, settings, now, locale }: AnalyticsChartsProps) {
  const t = useT();
  const formattedLocale = locale === 'ar' ? 'ar-u-nu-latn' : locale;

  const hasSessions = sessions.length > 0;
  const todayKey = dayKeyFromTimestamp(now, settings.dayStartHour);

  // 1. Line chart: focus time over last 30 days
  const lineData = hasSessions
    ? enumerateDays(addDays(todayKey, -29), todayKey).map((dKey) => {
        const rec = getDayRecord(tasks, sessions, settings, dKey);
        return {
          dayKey: dKey,
          dayLabel: formatDayLabel(dKey, formattedLocale, 'short'),
          focusMs: rec.focusMs,
        };
      })
    : [];

  // 2. Bar chart: focus time per weekday
  const weekdayTotals = [0, 0, 0, 0, 0, 0, 0];
  if (hasSessions) {
    for (const s of sessions) {
      if (isFocusKind(s.kind)) {
        const w = weekdayIndex(s.dayKey);
        weekdayTotals[w] = (weekdayTotals[w] ?? 0) + s.durationMs;
      }
    }
  }

  // Order weekdays according to settings.weekStartsOn
  const weekdayOrder: number[] = [];
  for (let i = 0; i < 7; i++) {
    weekdayOrder.push((settings.weekStartsOn + i) % 7);
  }

  const barData = hasSessions
    ? weekdayOrder.map((w) => {
        const d = new Date(2026, 7, 2 + w, 12, 0, 0, 0); // 2026-08-02 is Sunday (index 0)
        const label = new Intl.DateTimeFormat(formattedLocale, { weekday: 'short' }).format(d);
        return {
          weekday: w,
          weekdayLabel: label,
          focusMs: weekdayTotals[w]!,
        };
      })
    : [];

  // 3. Pie chart: completed vs incomplete tasks
  const compCount = completedTaskCount(tasks);
  const incompCount = incompleteTaskCount(tasks);
  const hasTasks = tasks.some((t) => t.deletedAt === null);

  const taskPieData: PieChartItem[] = hasTasks
    ? [
        { name: t('progress.completedTasks'), value: compCount, colorType: 'focus' },
        { name: t('progress.unfinishedTasks'), value: incompCount, colorType: 'neutral' },
      ]
    : [];

  // 4. Pie chart: focus vs break time split
  const totalFocus = totalFocusMs(sessions);
  let totalBreak = 0;
  for (const s of sessions) {
    if (!isFocusKind(s.kind)) {
      totalBreak += s.durationMs;
    }
  }

  const timeSplitData: PieChartItem[] = hasSessions && (totalFocus > 0 || totalBreak > 0)
    ? [
        { name: t('charts.focusTime'), value: totalFocus, colorType: 'focus' },
        { name: t('charts.breakTime'), value: totalBreak, colorType: 'break' },
      ]
    : [];

  const formatDurationAxis = (val: number) => formatDuration(val, formattedLocale);

  return (
    <div className="analytics-charts-grid">
      <LineChartCard
        title={t('analytics.chart.dailyFocusTrend')}
        data={lineData}
        xKey="dayLabel"
        series={[{ key: 'focusMs', name: t('charts.focusTime'), colorType: 'focus' }]}
        formatY={formatDurationAxis}
        formatTooltipValue={(val) => formatDuration(val, formattedLocale)}
      />

      <BarChartCard
        title={t('analytics.chart.weekdayFocus')}
        data={barData}
        xKey="weekdayLabel"
        series={[{ key: 'focusMs', name: t('charts.focusTime'), colorType: 'focus' }]}
        formatY={formatDurationAxis}
        formatTooltipValue={(val) => formatDuration(val, formattedLocale)}
      />

      <PieChartCard
        title={t('analytics.chart.taskCompletion')}
        data={taskPieData}
        formatValue={(val) => String(val)}
      />

      <PieChartCard
        title={t('analytics.chart.timeSplit')}
        data={timeSplitData}
        formatValue={(val) => formatDuration(val, formattedLocale)}
      />
    </div>
  );
}
