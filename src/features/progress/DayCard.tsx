import { useMemo } from 'react';
import type { Task, Session, Settings } from '../../domain/types';
import type { DayRecord } from '../../domain/stats/dayRecords';
import { buildDayLane } from '../../domain/tape/layout';
import { formatDayLabel, formatDuration, formatPercent } from '../../domain/time/format';
import { useT, type Language } from '../../i18n';
import { Card } from '../../components/Card';
import { StatCard } from '../../components/StatCard';
import { Tape } from '../../components/Tape';
import { EmptyState } from '../../components/EmptyState';
import { TaskRow } from '../tasks/TaskRow';
import { useTodayKey } from '../useTodayKey';

export interface DayCardProps {
  record: DayRecord;
  tasks: Task[];
  sessions: Session[];
  settings: Settings;
  locale: Language;
  selectedDayKey?: string;
  onSelectDay?: (dayKey: string) => void;
}

export function DayCard({
  record,
  tasks,
  sessions,
  settings,
  locale,
  selectedDayKey,
  onSelectDay,
}: DayCardProps) {
  const t = useT();
  const todayKey = useTodayKey();

  const formattedLocale = locale === 'ar' ? 'ar-u-nu-latn' : locale;
  const dateLabel = formatDayLabel(record.dayKey, formattedLocale, 'long');
  const dayLaneBlocks = buildDayLane(sessions, record.dayKey, settings.dayStartHour);

  const focusTimeStr = formatDuration(record.focusMs, formattedLocale);
  const productivityStr = formatPercent(record.productivityPct, formattedLocale);

  const isSelected = selectedDayKey === undefined || selectedDayKey === record.dayKey;

  const dayTasks = useMemo(
    () => tasks.filter((t) => t.deletedAt === null && t.dayKey === record.dayKey),
    [tasks, record.dayKey]
  );

  const pendingTasks = useMemo(
    () => dayTasks.filter((t) => t.completedAt === null && t.completedDayKey === null),
    [dayTasks]
  );

  const completedTasks = useMemo(
    () => dayTasks.filter((t) => t.completedAt !== null || t.completedDayKey !== null),
    [dayTasks]
  );

  return (
    <Card className="day-card">
      <div className="day-card-header">
        <button
          type="button"
          className="day-card-select-btn"
          aria-pressed={isSelected}
          onClick={() => onSelectDay?.(record.dayKey)}
        >
          <h3 className="day-card-date">{dateLabel}</h3>
        </button>
      </div>

      <div className="day-card-metrics">
        <StatCard label={t('progress.focusTime')} value={focusTimeStr} />
        <StatCard label={t('progress.completedTasks')} value={record.completedTasks} />
        <StatCard label={t('progress.unfinishedTasks')} value={record.unfinishedTasks} />
        <StatCard label={t('progress.productivity')} value={productivityStr} />
        <StatCard label={t('progress.sessionsCompleted')} value={record.sessionsCompleted} />
        <StatCard label={t('progress.pomodoroSessions')} value={record.pomodoroSessions} />
      </div>

      <div className="day-card-tape">
        <Tape
          zoom="day"
          lanes={[{ dayKey: record.dayKey, blocks: dayLaneBlocks }]}
          locale={locale}
          emptyText={t('placeholder.dashboard')}
        />
      </div>

      {isSelected && (
        <div className="day-card-tasks" data-testid="day-card-tasks">
          {dayTasks.length === 0 ? (
            <EmptyState title={t('tasks.empty')} />
          ) : (
            <div className="task-list">
              {pendingTasks.length > 0 && (
                <section className="task-group">
                  <h2 className="task-group-heading">
                    {t('tasks.pendingCount', { count: pendingTasks.length })}
                  </h2>
                  <div className="task-group-items">
                    {pendingTasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        hideTimer={record.dayKey !== todayKey}
                        showMoveToToday={record.dayKey !== todayKey}
                      />
                    ))}
                  </div>
                </section>
              )}

              {completedTasks.length > 0 && (
                <section className="task-group">
                  <h2 className="task-group-heading">
                    {t('tasks.completedCount', { count: completedTasks.length })}
                  </h2>
                  <div className="task-group-items">
                    {completedTasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        hideTimer={record.dayKey !== todayKey}
                        showMoveToToday={false}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
