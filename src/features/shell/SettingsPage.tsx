import { useT } from '../../i18n';
import { EmptyState } from '../../components/EmptyState';

export function SettingsPage() {
  const t = useT();
  return <EmptyState title={t('placeholder.settings')} />;
}
