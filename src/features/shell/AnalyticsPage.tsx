import { useT } from '../../i18n';
import { EmptyState } from '../../components/EmptyState';

export function AnalyticsPage() {
  const t = useT();
  return <EmptyState title={t('placeholder.analytics')} />;
}
