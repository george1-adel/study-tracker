import { useAppStore } from '../../store/useAppStore';
import { useT } from '../../i18n';
import { elapsedMs, remainingMs } from '../../domain/timer/engine';
import { formatClock } from '../../domain/time/format';
import { Button, Ltr } from '../../components';
import { unlockAudio } from '../../platform/sound';
import { useTimerTick } from './useTimerTick';
import { useTimerCompletion } from './useTimerCompletion';
import './timer.css';

export function PomodoroPanel() {
  const t = useT();
  const activeTimer = useAppStore((s) => s.activeTimer);
  const tasks = useAppStore((s) => s.tasks);
  const settings = useAppStore((s) => s.settings);
  const pause = useAppStore((s) => s.pause);
  const resume = useAppStore((s) => s.resume);
  const finish = useAppStore((s) => s.finish);

  useTimerTick();
  const toastNode = useTimerCompletion();

  if (!activeTimer || !activeTimer.pomodoro) {
    return toastNode ? <div className="timer-toast-slot">{toastNode}</div> : null;
  }

  const task = tasks.find((t) => t.id === activeTimer.taskId);
  const taskTitle = task ? task.title : '';

  const now = Date.now();
  const ms = remainingMs(activeTimer, now) ?? 0;
  const elapsed = elapsedMs(activeTimer, now);
  const formattedTime = formatClock(ms);
  const isRunning = activeTimer.status === 'running';

  const phase = activeTimer.pomodoro.phase;
  const isWork = phase === 'work';
  const isShortBreak = phase === 'short_break';
  const isLongBreak = phase === 'long_break';
  const isBreak = isShortBreak || isLongBreak;

  const cyclesBeforeLongBreak = settings.pomodoro.cyclesBeforeLongBreak;
  const completedWorkCycles = activeTimer.pomodoro.completedWorkCycles;

  let completedDotsCount = completedWorkCycles % cyclesBeforeLongBreak;
  if (completedDotsCount === 0 && completedWorkCycles > 0 && isLongBreak) {
    completedDotsCount = cyclesBeforeLongBreak;
  }

  let phaseLabel = t('timer.work');
  if (isShortBreak) {
    phaseLabel = t('timer.shortBreak');
  } else if (isLongBreak) {
    phaseLabel = t('timer.longBreak');
  }

  let statusMessage: string | null = null;
  if (!isRunning && elapsed === 0) {
    if (isBreak) {
      statusMessage = t('timer.workFinished');
    } else if (isWork && completedWorkCycles > 0) {
      statusMessage = t('timer.breakFinished');
    }
  }

  let primaryButtonText = t('timer.pause');
  if (!isRunning) {
    if (elapsed === 0) {
      primaryButtonText = isWork ? t('timer.startWork') : t('timer.startBreak');
    } else {
      primaryButtonText = t('timer.resume');
    }
  }

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
    <div className="timer-panel pomodoro-panel">
      {toastNode && <div className="timer-toast-slot">{toastNode}</div>}
      <div className="timer-panel-task-title">{taskTitle}</div>
      <div className="pomodoro-phase-label">{phaseLabel}</div>
      <div className="timer-panel-clock-wrapper">
        <span className={`timer-clock ${isBreak ? 'timer-clock-break' : ''}`} aria-live="off">
          <Ltr>{formattedTime}</Ltr>
        </span>
      </div>
      <div
        className="pomodoro-dots"
        aria-label={t('timer.cycleProgress', { count: completedDotsCount, total: cyclesBeforeLongBreak })}
      >
        {Array.from({ length: cyclesBeforeLongBreak }).map((_, index) => (
          <span
            key={index}
            className={`pomodoro-dot ${index < completedDotsCount ? 'completed' : ''}`}
          />
        ))}
      </div>
      {statusMessage && <div className="pomodoro-status-message">{statusMessage}</div>}
      <div className="timer-panel-actions">
        <Button variant="secondary" onClick={handleTogglePause}>
          {primaryButtonText}
        </Button>
        <Button variant="primary" onClick={handleFinish}>
          {t('timer.finish')}
        </Button>
      </div>
      <div className="sr-only" role="status">
        {`${phaseLabel} ${taskTitle} ${formattedTime}`}
      </div>
    </div>
  );
}
