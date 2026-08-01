import type { Session, Settings } from '../../domain/types';
import { streakSummary, type StreakSummary } from '../../domain/stats/streaks';
import { formatDuration, formatDayLabel } from '../../domain/time/format';
import { useT, type Language } from '../../i18n';
import { Card } from '../../components/Card';
import { Ltr } from '../../components/Ltr';

export interface StreakPanelProps {
  sessions: Session[];
  settings: Settings;
  now: number;
  locale: Language;
}

export function StreakPanel({ sessions, settings, now, locale }: StreakPanelProps) {
  const t = useT();
  const formattedLocale = locale === 'ar' ? 'ar-u-nu-latn' : locale;

  const summary: StreakSummary = streakSummary(sessions, settings, now);

  const minFocusStr = formatDuration(settings.streakMinFocusMs, formattedLocale);

  const getStateText = () => {
    switch (summary.state) {
      case 'active':
        return t('analytics.streak.stateActive');
      case 'at_risk':
        return t('analytics.streak.stateAtRisk');
      case 'broken':
        return t('analytics.streak.stateBroken');
    }
  };

  return (
    <Card className="streak-panel-card">
      <h3 className="analytics-section-title">{t('analytics.streak.title')}</h3>

      <div className="streak-main-display">
        <div className="streak-hero">
          <Ltr className="streak-count-display">{summary.current}</Ltr>
          <div className="streak-state-badge streak-state-{summary.state}">
            {getStateText()}
          </div>
        </div>

        <p className="streak-rule-notice">
          {t('analytics.streak.ruleNotice', { minTime: minFocusStr })}
        </p>
      </div>

      <div className="streak-metrics-row">
        <div className="streak-metric-item">
          <span className="streak-metric-label">{t('analytics.streak.longest')}</span>
          <Ltr className="streak-metric-value">{summary.longest}</Ltr>
        </div>
        <div className="streak-metric-item">
          <span className="streak-metric-label">{t('analytics.streak.totalDays')}</span>
          <Ltr className="streak-metric-value">{summary.totalDays}</Ltr>
        </div>
      </div>

      <div className="streak-history-section">
        <h4 className="streak-history-title">{t('analytics.streak.history')}</h4>
        {summary.history.length === 0 ? (
          <p className="streak-history-empty">{t('analytics.streak.noHistory')}</p>
        ) : (
          <ul className="streak-history-list">
            {summary.history.map((run, idx) => {
              const startStr = formatDayLabel(run.startDay, formattedLocale, 'short');
              const endStr = formatDayLabel(run.endDay, formattedLocale, 'short');
              const dateRangeStr = run.length === 1 ? startStr : `${startStr} – ${endStr}`;
              const countStr = t('analytics.streak.daysCount', { count: run.length });

              return (
                <li key={idx} className="streak-history-item">
                  <span className="streak-history-date">{dateRangeStr}</span>
                  <Ltr className="streak-history-count">{countStr}</Ltr>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
}
