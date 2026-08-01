import type { Task, Session, Settings } from '../../domain/types';
import {
  totalFocusMs,
  weeklyFocusMs,
  monthlyFocusMs,
  avgDailyFocusMs,
  avgTaskCompletionMs,
  completedTaskCount,
  incompleteTaskCount,
  pomodoroCount,
  stopwatchCount,
  longestSessionMs,
  shortestSessionMs,
  bestDay,
  bestWeekday,
  bestWeek,
  bestMonth,
} from '../../domain/stats';
import { formatDuration, formatDayLabel, formatMonthLabel } from '../../domain/time/format';
import { useT, type Language } from '../../i18n';
import { StatCard } from '../../components/StatCard';
import { Card } from '../../components/Card';

export interface StatGridProps {
  tasks: Task[];
  sessions: Session[];
  settings: Settings;
  now: number;
  locale: Language;
}

export function StatGrid({ tasks, sessions, settings, now, locale }: StatGridProps) {
  const t = useT();
  const formattedLocale = locale === 'ar' ? 'ar-u-nu-latn' : locale;

  // Domain aggregations
  const total = totalFocusMs(sessions);
  const weekly = weeklyFocusMs(sessions, now, settings);
  const monthly = monthlyFocusMs(sessions, now, settings);
  const avgDaily = avgDailyFocusMs(sessions);
  const avgTaskComp = avgTaskCompletionMs(tasks, sessions);

  const completedTasks = completedTaskCount(tasks);
  const incompleteTasks = incompleteTaskCount(tasks);
  const pomodoros = pomodoroCount(sessions);
  const stopwatches = stopwatchCount(sessions);

  const longest = longestSessionMs(sessions);
  const shortest = shortestSessionMs(sessions);

  const bDay = bestDay(sessions);
  const bWday = bestWeekday(sessions);
  const bWk = bestWeek(sessions, settings);
  const bMth = bestMonth(sessions);

  // Formatting helpers for null/empty aggregate rules
  const formatDurationValue = (ms: number): string | null => {
    if (ms <= 0) return null;
    return formatDuration(ms, formattedLocale);
  };

  const getBestWeekdayStr = (weekday: number | undefined): string | null => {
    if (weekday === undefined) return null;
    // 2026-08-02 is a Sunday (weekday index 0)
    const d = new Date(2026, 7, 2 + weekday, 12, 0, 0, 0);
    return new Intl.DateTimeFormat(formattedLocale, { weekday: 'long' }).format(d);
  };

  const bestDayVal = bDay ? formatDayLabel(bDay.dayKey, formattedLocale, 'short') : null;
  const bestWdayVal = bWday ? getBestWeekdayStr(bWday.weekday) : null;
  const bestWeekVal = bWk
    ? `${formatDayLabel(bWk.startDayKey, formattedLocale, 'short')} – ${formatDayLabel(bWk.endDayKey, formattedLocale, 'short')}`
    : null;
  const bestMonthVal = bMth ? formatMonthLabel(bMth.monthKey, formattedLocale) : null;

  return (
    <div className="analytics-stat-section">
      <Card className="analytics-section-card">
        <h3 className="analytics-section-title">{t('analytics.statsGroup')}</h3>
        <div className="stat-grid">
          <StatCard label={t('analytics.stat.totalFocus')} value={formatDurationValue(total)} />
          <StatCard label={t('analytics.stat.weeklyFocus')} value={formatDurationValue(weekly)} />
          <StatCard label={t('analytics.stat.monthlyFocus')} value={formatDurationValue(monthly)} />
          <StatCard label={t('analytics.stat.avgDailyFocus')} value={formatDurationValue(avgDaily)} />
          <StatCard label={t('analytics.stat.avgTaskCompletion')} value={formatDurationValue(avgTaskComp)} />
          <StatCard label={t('analytics.stat.completedTasks')} value={completedTasks} />
          <StatCard label={t('analytics.stat.incompleteTasks')} value={incompleteTasks} />
          <StatCard label={t('analytics.stat.pomodoroSessions')} value={pomodoros} />
          <StatCard label={t('analytics.stat.stopwatchSessions')} value={stopwatches} />
          <StatCard label={t('analytics.stat.longestSession')} value={formatDurationValue(longest)} />
          <StatCard label={t('analytics.stat.shortestSession')} value={formatDurationValue(shortest)} />
        </div>
      </Card>

      <Card className="analytics-section-card">
        <h3 className="analytics-section-title">{t('analytics.bestsGroup')}</h3>
        <div className="stat-grid">
          <StatCard label={t('analytics.bestDay')} value={bestDayVal} />
          <StatCard label={t('analytics.bestWeekday')} value={bestWdayVal} />
          <StatCard label={t('analytics.bestWeek')} value={bestWeekVal} />
          <StatCard label={t('analytics.bestMonth')} value={bestMonthVal} />
        </div>
      </Card>
    </div>
  );
}
