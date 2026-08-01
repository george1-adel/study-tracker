import type { Session, Settings } from '../../domain/types';
import type { DayRecord } from '../../domain/stats/dayRecords';
import { buildDayLane } from '../../domain/tape/layout';
import { formatDayLabel, formatDuration, formatPercent } from '../../domain/time/format';
import { useT, type Language } from '../../i18n';
import { Card } from '../../components/Card';
import { StatCard } from '../../components/StatCard';
import { Tape } from '../../components/Tape';

export interface DayCardProps {
  record: DayRecord;
  sessions: Session[];
  settings: Settings;
  locale: Language;
}

export function DayCard({ record, sessions, settings, locale }: DayCardProps) {
  const t = useT();

  const formattedLocale = locale === 'ar' ? 'ar-u-nu-latn' : locale;
  const dateLabel = formatDayLabel(record.dayKey, formattedLocale, 'long');
  const dayLaneBlocks = buildDayLane(sessions, record.dayKey, settings.dayStartHour);

  const focusTimeStr = formatDuration(record.focusMs, formattedLocale);
  const productivityStr = formatPercent(record.productivityPct, formattedLocale);

  return (
    <Card className="day-card">
      <div className="day-card-header">
        <h3 className="day-card-date">{dateLabel}</h3>
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
    </Card>
  );
}
