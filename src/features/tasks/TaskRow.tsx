import { useMemo, useState } from 'react';
import type { Task } from '../../domain/types';
import { useAppStore, useSettings } from '../../store/useAppStore';
import { useT } from '../../i18n';
import { dayKeyFromTimestamp } from '../../domain/time/dayKey';
import { formatDayLabel, formatDuration } from '../../domain/time/format';
import { Checkbox } from '../../components/Checkbox';
import { IconButton } from '../../components/IconButton';
import { Ltr } from '../../components/Ltr';
import { TaskEditDialog } from './TaskEditDialog';
import { DeleteTaskDialog } from './DeleteTaskDialog';
import { TimerControls } from '../timer';

export interface TaskRowProps {
  task: Task;
}

const MODE_KEY_MAP: Record<Task['mode'], 'tasks.mode.stopwatch' | 'tasks.mode.countdown' | 'tasks.mode.pomodoro'> = {
  stopwatch: 'tasks.mode.stopwatch',
  countdown: 'tasks.mode.countdown',
  pomodoro: 'tasks.mode.pomodoro',
};

export function TaskRow({ task }: TaskRowProps) {
  const t = useT();
  const settings = useSettings();
  const toggleTaskCompleted = useAppStore((s) => s.toggleTaskCompleted);

  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isCompleted = task.completedAt !== null || task.completedDayKey !== null;

  const dayKey = useMemo(
    () => dayKeyFromTimestamp(task.createdAt, settings.dayStartHour),
    [task.createdAt, settings.dayStartHour]
  );

  const locale = settings.language === 'ar' ? 'ar-u-nu-latn' : 'en';

  const formattedDate = useMemo(
    () => formatDayLabel(dayKey, locale, 'short'),
    [dayKey, locale]
  );

  const formattedDuration = useMemo(() => {
    if (task.mode === 'countdown' && task.targetMs !== null) {
      return formatDuration(task.targetMs, locale);
    }
    return null;
  }, [task.mode, task.targetMs, locale]);

  const handleToggle = () => {
    toggleTaskCompleted(task.id, Date.now());
  };

  return (
    <div className="task-row">
      <div className="task-row-main">
        <Checkbox
          checked={isCompleted}
          onChange={handleToggle}
          label={
            <span className={isCompleted ? 'task-title completed' : 'task-title'}>
              {task.title}
            </span>
          }
        />
      </div>

      <div className="task-row-meta">
        <Ltr className="task-date">{formattedDate}</Ltr>
        <span className="task-mode">{t(MODE_KEY_MAP[task.mode])}</span>
        {formattedDuration && <Ltr className="task-target-duration">{formattedDuration}</Ltr>}
      </div>

      <div className="task-timer-slot" data-testid="task-timer-slot">
        <TimerControls task={task} />
      </div>

      <div className="task-row-actions">
        <IconButton aria-label={t('tasks.edit')} onClick={() => setIsEditing(true)}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 2l3 3-9 9H2v-3l9-9z" />
          </svg>
        </IconButton>
        <IconButton aria-label={t('tasks.delete')} onClick={() => setIsDeleting(true)}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h10M5 6v7a1 1 0 001 1h4a1 1 0 001-1V6M8 3v3" />
          </svg>
        </IconButton>
      </div>

      {isEditing && (
        <TaskEditDialog task={task} isOpen={isEditing} onClose={() => setIsEditing(false)} />
      )}
      {isDeleting && (
        <DeleteTaskDialog task={task} isOpen={isDeleting} onClose={() => setIsDeleting(false)} />
      )}
    </div>
  );
}
