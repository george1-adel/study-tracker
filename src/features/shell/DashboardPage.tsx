import { useT } from '../../i18n';
import { EmptyState } from '../../components/EmptyState';

export function DashboardPage() {
  const t = useT();
  return <EmptyState title={t('placeholder.dashboard')} />;
}
