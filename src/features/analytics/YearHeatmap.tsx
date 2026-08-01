import type { Session, Settings } from '../../domain/types';
import { buildYearIntensity, type YearDayIntensity } from '../../domain/tape/layout';
import { dayKeyFromTimestamp, addDays, startOfWeek, endOfWeek } from '../../domain/time/dayKey';
import { formatDayLabel, formatDuration } from '../../domain/time/format';
import { useT, type Language } from '../../i18n';
import { Card } from '../../components/Card';

export interface YearHeatmapProps {
  sessions: Session[];
  settings: Settings;
  now: number;
  locale: Language;
}

export function YearHeatmap({ sessions, settings, now, locale }: YearHeatmapProps) {
  const t = useT();
  const formattedLocale = locale === 'ar' ? 'ar-u-nu-latn' : locale;

  const today = dayKeyFromTimestamp(now, settings.dayStartHour);
  const startRaw = addDays(today, -364);
  const fromDayKey = startOfWeek(startRaw, settings.weekStartsOn);
  const toDayKey = endOfWeek(today, settings.weekStartsOn);

  const intensities: YearDayIntensity[] = buildYearIntensity(
    sessions,
    fromDayKey,
    toDayKey,
    settings.dayStartHour
  );

  // Group intensity items into 7-day columns (weeks)
  const weeks: YearDayIntensity[][] = [];
  for (let i = 0; i < intensities.length; i += 7) {
    weeks.push(intensities.slice(i, i + 7));
  }

  return (
    <Card className="year-heatmap-card">
      <h3 className="analytics-section-title">{t('analytics.heatmap.title')}</h3>
      <div className="tape-container tape-zoom-year" dir="ltr" role="region" aria-label={t('analytics.heatmap.title')}>
        <div className="year-heatmap-grid">
          {weeks.map((week, wIdx) => (
            <div key={wIdx} className="heatmap-week-column">
              {week.map((item) => {
                const isNoData = item.intensity === null;
                const durationStr = formatDuration(item.focusMs, formattedLocale);
                const dayLabelStr = formatDayLabel(item.dayKey, formattedLocale, 'short');
                const cellTooltip = `${dayLabelStr}: ${durationStr}`;

                return (
                  <div
                    key={item.dayKey}
                    className={`heatmap-cell ${isNoData ? 'heatmap-cell-empty' : 'heatmap-cell-active'}`}
                    style={
                      !isNoData
                        ? {
                            backgroundColor: 'var(--trace)',
                            opacity: Math.max(0.35, item.intensity!),
                          }
                        : undefined
                    }
                    title={cellTooltip}
                    aria-label={cellTooltip}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
