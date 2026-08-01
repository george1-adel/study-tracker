import { useAppStore } from '../../store/useAppStore';
import { useT } from '../../i18n';
import { elapsedMs, remainingMs } from '../../domain/timer/engine';
import { formatClock } from '../../domain/time/format';
import { Button, Ltr } from '../../components';
import { unlockAudio } from '../../platform/sound';
import { useTimerTick } from './useTimerTick';
import { useTimerCompletion } from './useTimerCompletion';
import { PomodoroPanel } from './PomodoroPanel';
import './timer.css';

export function TimerPanel() {
  const t = useT();
  const activeTimer = useAppStore((s) => s.activeTimer);
  const tasks = useAppStore((s) => s.tasks);
  const pause = useAppStore((s) => s.pause);
  const resume = useAppStore((s) => s.resume);
  const finish = useAppStore((s) => s.finish);

  useTimerTick();
  const toastNode = useTimerCompletion();

  if (!activeTimer) {
    return toastNode ? <div className="timer-toast-slot">{toastNode}</div> : null;
  }

  if (activeTimer.pomodoro) {
    return <PomodoroPanel />;
  }

  const task = tasks.find((t) => t.id === activeTimer.taskId);
  const taskTitle = task ? task.title : '';

  const now = Date.now();
  let ms: number;
  if (activeTimer.kind === 'countdown' || activeTimer.targetMs !== null) {
    ms = remainingMs(activeTimer, now) ?? 0;
  } else {
    ms = elapsedMs(activeTimer, now);
  }

  const formattedTime = formatClock(ms);
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

  return (
    <div className="timer-panel">
      {toastNode && <div className="timer-toast-slot">{toastNode}</div>}
      <div className="timer-panel-task-title">{taskTitle}</div>
      <div className="timer-panel-clock-wrapper">
        <span className="timer-clock" aria-live="off">
          <Ltr>{formattedTime}</Ltr>
        </span>
      </div>
      <div className="timer-panel-actions">
        <Button variant="secondary" onClick={handleTogglePause}>
          {isRunning ? t('timer.pause') : t('timer.resume')}
        </Button>
        <Button variant="primary" onClick={handleFinish}>
          {t('timer.finish')}
        </Button>
      </div>
      <div className="sr-only" role="status">
        {isRunning ? `${taskTitle} ${formattedTime}` : `${taskTitle} ${formattedTime}`}
      </div>
    </div>
  );
}
