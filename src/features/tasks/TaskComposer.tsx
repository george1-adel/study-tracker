import React, { useState } from 'react';
import type { TimerMode } from '../../domain/types';
import { useAppStore } from '../../store/useAppStore';
import { useT } from '../../i18n';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { NumberInput } from '../../components/NumberInput';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Ltr } from '../../components/Ltr';

export function TaskComposer() {
  const t = useT();
  const addTask = useAppStore((s) => s.addTask);

  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<TimerMode>('stopwatch');
  const [hours, setHours] = useState<number>(0);
  const [minutes, setMinutes] = useState<number>(25);

  const trimmedTitle = title.trim();
  const isTitleValid = trimmedTitle.length > 0;

  const durationMs = (hours * 3600 + minutes * 60) * 1000;
  const isDurationValid = mode === 'countdown' ? durationMs > 0 : true;

  const isValid = isTitleValid && isDurationValid;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    const targetMs = mode === 'countdown' ? durationMs : null;
    addTask(trimmedTitle, mode, targetMs);

    setTitle('');
    setHours(0);
    setMinutes(25);
  };

  const modeOptions = [
    { value: 'stopwatch', label: t('tasks.mode.stopwatch') },
    { value: 'countdown', label: t('tasks.mode.countdown') },
    { value: 'pomodoro', label: t('tasks.mode.pomodoro') },
  ];

  return (
    <Card className="task-composer-card">
      <form onSubmit={handleSubmit} className="task-composer-form">
        <div className="task-composer-row">
          <Input
            className="task-composer-title-field"
            label={t('tasks.title')}
            placeholder={t('tasks.titlePlaceholder')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            error={!isTitleValid && title.length > 0 ? t('tasks.titleRequired') : undefined}
          />
          <Select
            className="task-composer-mode-field"
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
        </div>
        {!isTitleValid && title.length === 0 && (
          <p className="field-error-text">{t('tasks.titleRequired')}</p>
        )}
        {mode === 'countdown' && !isDurationValid && (
          <p className="field-error-text">{t('tasks.durationRequired')}</p>
        )}
        <div className="task-composer-actions">
          <Button type="submit" variant="primary" disabled={!isValid}>
            {t('tasks.add')}
          </Button>
        </div>
      </form>
    </Card>
  );
}
