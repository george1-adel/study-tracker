import type { Task, Session, Settings } from '../../domain/types';
import type { DayRecord } from '../../domain/stats/dayRecords';
import { compareDayKeys } from '../../domain/time/dayKey';
import { useT, type Language } from '../../i18n';
import { EmptyState } from '../../components/EmptyState';
import { DayCard } from './DayCard';

export interface DayTimelineProps {
  records: DayRecord[];
  tasks: Task[];
  sessions: Session[];
  settings: Settings;
  locale: Language;
  selectedDayKey?: string;
  onSelectDay?: (dayKey: string) => void;
}

export function DayTimeline({
  records,
  tasks,
  sessions,
  settings,
  locale,
  selectedDayKey,
  onSelectDay,
}: DayTimelineProps) {
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
          tasks={tasks}
          sessions={sessions}
          settings={settings}
          locale={locale}
          selectedDayKey={selectedDayKey}
          onSelectDay={onSelectDay}
        />
      ))}
    </div>
  );
}
