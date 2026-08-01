import { useT } from '../../i18n';
import { EmptyState } from '../../components/EmptyState';

export function ProgressPage() {
  const t = useT();
  return <EmptyState title={t('placeholder.progress')} />;
}
