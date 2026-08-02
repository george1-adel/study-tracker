import { useState } from 'react';
import type { Task, Session, Settings } from '../../domain/types';
import { buildDayRecords, getDayRecord } from '../../domain/stats/dayRecords';
import { buildYearIntensity } from '../../domain/tape/layout';
import { monthKey, dayKeyFromTimestamp, startOfMonth, endOfMonth } from '../../domain/time/dayKey';
import { formatMonthLabel, formatDuration } from '../../domain/time/format';
import { useT, type Language } from '../../i18n';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { Ltr } from '../../components/Ltr';
import { buildMonthGrid, addMonths, getWeekdayLabels } from './monthGrid';
import { DayCard } from './DayCard';

export interface CalendarMonthProps {
  tasks: Task[];
  sessions: Session[];
  settings: Settings;
  locale: Language;
  selectedDayKey?: string;
  onSelectDay?: (dayKey: string) => void;
}

export function CalendarMonth({
  tasks,
  sessions,
  settings,
  locale,
  selectedDayKey,
  onSelectDay,
}: CalendarMonthProps) {
  const t = useT();

  const allRecords = buildDayRecords(tasks, sessions, settings);

  const formattedLocale = locale === 'ar' ? 'ar-u-nu-latn' : locale;

  const todayKey = dayKeyFromTimestamp(Date.now(), settings.dayStartHour);
  const todayMonthKey = monthKey(todayKey);

  let minMonthKey = todayMonthKey;
  let maxMonthKey = todayMonthKey;

  if (allRecords.length > 0) {
    const earliestDayKey = allRecords[0]?.dayKey ?? todayMonthKey;
    const latestDayKey = allRecords[allRecords.length - 1]?.dayKey ?? todayMonthKey;
    minMonthKey = monthKey(earliestDayKey);
    maxMonthKey = monthKey(latestDayKey);
  }

  const [currentMonthKey, setCurrentMonthKey] = useState<string>(maxMonthKey);
  const [internalSelectedDayKey, setInternalSelectedDayKey] = useState<string>(todayKey);

  const activeSelectedDayKey = selectedDayKey ?? internalSelectedDayKey;

  const handleDayClick = (dayKey: string) => {
    setInternalSelectedDayKey(dayKey);
    onSelectDay?.(dayKey);
  };

  if (allRecords.length === 0) {
    return <EmptyState title={t('placeholder.progress')} />;
  }

  const isPrevDisabled = currentMonthKey <= minMonthKey;
  const isNextDisabled = currentMonthKey >= maxMonthKey;

  const handlePrev = () => {
    if (!isPrevDisabled) {
      setCurrentMonthKey((prev) => addMonths(prev, -1));
    }
  };

  const handleNext = () => {
    if (!isNextDisabled) {
      setCurrentMonthKey((prev) => addMonths(prev, 1));
    }
  };

  const monthLabel = formatMonthLabel(currentMonthKey, formattedLocale);
  const weekdayLabels = getWeekdayLabels(settings.weekStartsOn, locale);

  const gridInfo = buildMonthGrid(currentMonthKey, settings.weekStartsOn);

  const firstDayInMonth = `${currentMonthKey}-01`;
  const startKey = startOfMonth(firstDayInMonth);
  const endKey = endOfMonth(startKey);

  const yearIntensity = buildYearIntensity(sessions, startKey, endKey, settings.dayStartHour);
  const intensityMap = new Map<string, { intensity: number | null; focusMs: number }>();
  for (const item of yearIntensity) {
    intensityMap.set(item.dayKey, { intensity: item.intensity, focusMs: item.focusMs });
  }

  const selectedRecord = getDayRecord(tasks, sessions, settings, activeSelectedDayKey);

  return (
    <div className="calendar-month-wrapper">
      <Card className="calendar-month-card">
        <div className="calendar-header">
          <h3 className="calendar-month-title">{monthLabel}</h3>
          <div className="calendar-nav">
            <Button
              variant="secondary"
              onClick={handlePrev}
              disabled={isPrevDisabled}
              aria-label={t('progress.prevMonth')}
            >
              {t('progress.prevMonth')}
            </Button>
            <Button
              variant="secondary"
              onClick={handleNext}
              disabled={isNextDisabled}
              aria-label={t('progress.nextMonth')}
            >
              {t('progress.nextMonth')}
            </Button>
          </div>
        </div>

        {/* NO dir="ltr" here: Calendar follows page direction */}
        <div className="calendar-grid-container">
          <div className="calendar-weekdays-row">
            {weekdayLabels.map((lbl, idx) => (
              <div key={idx} className="calendar-weekday-cell">
                {lbl}
              </div>
            ))}
          </div>

          <div className="calendar-days-grid">
            {gridInfo.cells.map((cell, idx) => {
              if (cell.type === 'blank') {
                return <div key={`blank-${idx}`} className="calendar-cell calendar-cell-blank" />;
              }

              const dayData = intensityMap.get(cell.dayKey!);
              const intensity = dayData?.intensity ?? null;
              const focusMs = dayData?.focusMs ?? 0;
              const tooltipStr = `${cell.dayKey}: ${formatDuration(focusMs, formattedLocale)}`;
              const isPressed = cell.dayKey === activeSelectedDayKey;

              return (
                <button
                  type="button"
                  key={cell.dayKey}
                  className={`calendar-cell calendar-cell-day ${intensity !== null ? 'calendar-cell-active' : ''}`}
                  aria-pressed={isPressed}
                  onClick={() => handleDayClick(cell.dayKey!)}
                  title={tooltipStr}
                >
                  <span className="calendar-day-number">
                    <Ltr>{cell.dayNumber}</Ltr>
                  </span>
                  {intensity !== null && (
                    <div
                      className="calendar-day-intensity-bar"
                      style={{
                        height: `${Math.max(4, Math.round(intensity * 16))}px`,
                        opacity: Math.max(0.4, intensity),
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      <div className="calendar-selected-day-card" style={{ marginTop: '1rem' }}>
        <DayCard
          record={selectedRecord}
          tasks={tasks}
          sessions={sessions}
          settings={settings}
          locale={locale}
          selectedDayKey={activeSelectedDayKey}
          onSelectDay={handleDayClick}
        />
      </div>
    </div>
  );
}
