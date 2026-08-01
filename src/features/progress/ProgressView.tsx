import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { buildDayRecords } from '../../domain/stats/dayRecords';
import { useT } from '../../i18n';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { DayTimeline } from './DayTimeline';
import { CalendarMonth } from './CalendarMonth';

export function ProgressView() {
  const t = useT();
  const tasks = useAppStore((s) => s.tasks);
  const sessions = useAppStore((s) => s.sessions);
  const settings = useAppStore((s) => s.settings);

  const [view, setView] = useState<'timeline' | 'calendar'>('timeline');

  const records = buildDayRecords(tasks, sessions, settings);

  if (records.length === 0) {
    return <EmptyState title={t('placeholder.progress')} />;
  }

  return (
    <div className="progress-page">
      <div className="progress-page-header">
        <h2 className="progress-page-title">{t('progress.title')}</h2>
        <div className="progress-view-toggle">
          <Button
            variant={view === 'timeline' ? 'primary' : 'secondary'}
            onClick={() => setView('timeline')}
          >
            {t('progress.view.timeline')}
          </Button>
          <Button
            variant={view === 'calendar' ? 'primary' : 'secondary'}
            onClick={() => setView('calendar')}
          >
            {t('progress.view.calendar')}
          </Button>
        </div>
      </div>

      <div className="progress-page-content">
        {view === 'timeline' ? (
          <DayTimeline
            records={records}
            sessions={sessions}
            settings={settings}
            locale={settings.language}
          />
        ) : (
          <CalendarMonth
            tasks={tasks}
            sessions={sessions}
            settings={settings}
            locale={settings.language}
          />
        )}
      </div>
    </div>
  );
}
