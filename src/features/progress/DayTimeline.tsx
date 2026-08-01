import type { Session, Settings } from '../../domain/types';
import type { DayRecord } from '../../domain/stats/dayRecords';
import { compareDayKeys } from '../../domain/time/dayKey';
import { useT, type Language } from '../../i18n';
import { EmptyState } from '../../components/EmptyState';
import { DayCard } from './DayCard';

export interface DayTimelineProps {
  records: DayRecord[];
  sessions: Session[];
  settings: Settings;
  locale: Language;
}

export function DayTimeline({ records, sessions, settings, locale }: DayTimelineProps) {
  const t = useT();

  if (records.length === 0) {
    return <EmptyState title={t('placeholder.progress')} />;
  }

  // Reverse-chronological list: most recent first
  const sortedRecords = [...records].sort((a, b) => compareDayKeys(b.dayKey, a.dayKey));

  return (
    <div className="day-timeline">
      {sortedRecords.map((record) => (
        <DayCard
          key={record.dayKey}
          record={record}
          sessions={sessions}
          settings={settings}
          locale={locale}
        />
      ))}
    </div>
  );
}
