import React, { useState, useEffect } from 'react';
import type { Task, TimerMode } from '../../domain/types';
import { useAppStore } from '../../store/useAppStore';
import { useT } from '../../i18n';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { NumberInput } from '../../components/NumberInput';
import { Button } from '../../components/Button';
import { Ltr } from '../../components/Ltr';

export interface TaskEditDialogProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
}

export function TaskEditDialog({ task, isOpen, onClose }: TaskEditDialogProps) {
  const t = useT();
  const editTask = useAppStore((s) => s.editTask);

  const [title, setTitle] = useState(task.title);
  const [mode, setMode] = useState<TimerMode>(task.mode);
  const [hours, setHours] = useState<number>(
    task.targetMs ? Math.floor(task.targetMs / 3600000) : 0
  );
  const [minutes, setMinutes] = useState<number>(
    task.targetMs ? Math.floor((task.targetMs % 3600000) / 60000) : 25
  );

  useEffect(() => {
    if (isOpen) {
      setTitle(task.title);
      setMode(task.mode);
      setHours(task.targetMs ? Math.floor(task.targetMs / 3600000) : 0);
      setMinutes(task.targetMs ? Math.floor((task.targetMs % 3600000) / 60000) : 25);
    }
  }, [isOpen, task]);

  const trimmedTitle = title.trim();
  const isTitleValid = trimmedTitle.length > 0;

  const durationMs = (hours * 3600 + minutes * 60) * 1000;
  const isDurationValid = mode === 'countdown' ? durationMs > 0 : true;

  const isValid = isTitleValid && isDurationValid;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    const targetMs = mode === 'countdown' ? durationMs : null;
    editTask(task.id, {
      title: trimmedTitle,
      mode,
      targetMs,
    });
    onClose();
  };

  const modeOptions = [
    { value: 'stopwatch', label: t('tasks.mode.stopwatch') },
    { value: 'countdown', label: t('tasks.mode.countdown') },
    { value: 'pomodoro', label: t('tasks.mode.pomodoro') },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('tasks.editTitle')} closeLabel={t('action.close')}>
      <form onSubmit={handleSave} className="task-composer-form">
        <Input
          label={t('tasks.title')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={!isTitleValid ? t('tasks.titleRequired') : undefined}
        />
        <Select
          label={t('tasks.mode')}
          value={mode}
          onChange={(e) => setMode(e.target.value as TimerMode)}
          options={modeOptions}
        />
        {mode === 'countdown' && (
          <div className="task-composer-duration-fields">
            <NumberInput
              className="task-composer-number-field"
              label={<Ltr>{t('tasks.durationHours')}</Ltr>}
              min={0}
              value={hours}
              onChange={(e) => setHours(Math.max(0, parseInt(e.target.value, 10) || 0))}
            />
            <NumberInput
              className="task-composer-number-field"
              label={<Ltr>{t('tasks.durationMinutes')}</Ltr>}
              min={0}
              max={59}
              value={minutes}
              onChange={(e) => setMinutes(Math.max(0, Math.min(59, parseInt(e.target.value, 10) || 0)))}
            />
          </div>
        )}
        {mode === 'countdown' && !isDurationValid && (
          <p className="field-error-text">{t('tasks.durationRequired')}</p>
        )}
        <div className="dialog-actions">
          <Button variant="secondary" onClick={onClose}>
            {t('action.cancel')}
          </Button>
          <Button type="submit" variant="primary" disabled={!isValid}>
            {t('action.save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
