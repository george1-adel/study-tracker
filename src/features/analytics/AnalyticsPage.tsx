import { useAppStore } from '../../store/useAppStore';
import { useT } from '../../i18n';
import { StatGrid } from './StatGrid';
import { StreakPanel } from './StreakPanel';
import { YearHeatmap } from './YearHeatmap';
import { AnalyticsCharts } from './AnalyticsCharts';
import './analytics.css';

export function AnalyticsPage() {
  const t = useT();

  const tasks = useAppStore((s) => s.tasks);
  const sessions = useAppStore((s) => s.sessions);
  const settings = useAppStore((s) => s.settings);
  const locale = settings.language;

  const now = Date.now();

  return (
    <div className="analytics-page">
      <header className="analytics-page-header">
        <h2 className="analytics-page-title">{t('analytics.title')}</h2>
      </header>

      <div className="analytics-layout-grid">
        <StatGrid tasks={tasks} sessions={sessions} settings={settings} now={now} locale={locale} />
        <StreakPanel sessions={sessions} settings={settings} now={now} locale={locale} />
        <YearHeatmap sessions={sessions} settings={settings} now={now} locale={locale} />
        <AnalyticsCharts tasks={tasks} sessions={sessions} settings={settings} now={now} locale={locale} />
      </div>
    </div>
  );
}

export default AnalyticsPage;
