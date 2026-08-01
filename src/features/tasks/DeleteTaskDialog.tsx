import type { Task } from '../../domain/types';
import { useAppStore } from '../../store/useAppStore';
import { useT } from '../../i18n';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';

export interface DeleteTaskDialogProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
}

export function DeleteTaskDialog({ task, isOpen, onClose }: DeleteTaskDialogProps) {
  const t = useT();
  const deleteTask = useAppStore((s) => s.deleteTask);

  const handleConfirm = () => {
    deleteTask(task.id, Date.now());
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('tasks.deleteTitle')} closeLabel={t('action.close')}>
      <p>{t('tasks.deleteConfirm')}</p>
      <div className="dialog-actions">
        <Button variant="secondary" onClick={onClose}>
          {t('action.cancel')}
        </Button>
        <Button variant="danger" onClick={handleConfirm}>
          {t('action.delete')}
        </Button>
      </div>
    </Modal>
  );
}
