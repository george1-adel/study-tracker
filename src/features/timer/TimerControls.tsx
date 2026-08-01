import type { Task } from '../../domain/types';
import { useAppStore } from '../../store/useAppStore';
import { useT } from '../../i18n';
import { Button } from '../../components';
import { unlockAudio } from '../../platform/sound';
import { elapsedMs } from '../../domain/timer/engine';

export interface TimerControlsProps {
  task: Task;
}

export function TimerControls({ task }: TimerControlsProps) {
  const t = useT();
  const activeTimer = useAppStore((s) => s.activeTimer);
  const tasks = useAppStore((s) => s.tasks);
  const startTimerFor = useAppStore((s) => s.startTimerFor);
  const pause = useAppStore((s) => s.pause);
  const resume = useAppStore((s) => s.resume);
  const finish = useAppStore((s) => s.finish);

  const isCompleted = task.completedAt !== null || task.completedDayKey !== null;
  const isThisTaskRunning = activeTimer?.taskId === task.id;

  if (isThisTaskRunning) {
    const isRunning = activeTimer.status === 'running';

    const handleTogglePause = () => {
      if (isRunning) {
        pause(Date.now());
      } else {
        unlockAudio();
        resume(Date.now());
      }
    };

    const handleFinish = () => {
      finish(Date.now());
    };

    let toggleLabel = isRunning ? t('timer.pause') : t('timer.resume');
    if (!isRunning && activeTimer.pomodoro) {
      const elapsed = elapsedMs(activeTimer, Date.now());
      if (elapsed === 0) {
        toggleLabel = activeTimer.pomodoro.phase === 'work' ? t('timer.startWork') : t('timer.startBreak');
      }
    }

    return (
      <div className="timer-controls">
        <Button variant="secondary" onClick={handleTogglePause} aria-label={toggleLabel}>
          {toggleLabel}
        </Button>
        <Button variant="primary" onClick={handleFinish} aria-label={t('timer.finish')}>
          {t('timer.finish')}
        </Button>
      </div>
    );
  }

  if (isCompleted) {
    return null;
  }

  const anotherTask = activeTimer ? tasks.find((t) => t.id === activeTimer.taskId) : null;
  const anotherTaskTitle = anotherTask?.title ?? '';

  const handleStart = () => {
    unlockAudio();
    startTimerFor(task.id, Date.now());
  };

  const startNotice = anotherTask
    ? t('timer.switchNotice', { taskTitle: anotherTaskTitle })
    : undefined;

  return (
    <div className="timer-controls">
      <Button
        variant="primary"
        onClick={handleStart}
        title={startNotice}
        aria-label={startNotice ? `${t('timer.start')} (${startNotice})` : t('timer.start')}
      >
        {t('timer.start')}
      </Button>
    </div>
  );
}
