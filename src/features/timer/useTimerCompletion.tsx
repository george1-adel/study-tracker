import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useAppStore, useLastCompletion, useSettings, useTasks } from '../../store/useAppStore';
import { useT } from '../../i18n';
import { playAlarm } from '../../platform/sound';
import { notify } from '../../platform/notify';
import { Toast } from '../../components';

export function useTimerCompletion(): ReactNode | null {
  const lastCompletion = useLastCompletion();
  const settings = useSettings();
  const tasks = useTasks();
  const t = useT();

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'info' | 'error' | 'warning' | 'success'>('info');

  const processedSessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!lastCompletion) return;
    if (processedSessionIdRef.current === lastCompletion.sessionId) return;
    processedSessionIdRef.current = lastCompletion.sessionId;

    if (lastCompletion.silent) {
      useAppStore.getState().acknowledgeCompletion();
      return;
    }

    const state = useAppStore.getState();
    const session = state.sessions.find((s) => s.id === lastCompletion.sessionId);
    const task = session ? tasks.find((tk) => tk.id === session.taskId) : null;
    const taskTitleStr = task?.title ? `: ${task.title}` : '';

    const notifTitle = t('timer.notificationTitle');
    const notifBody = `${t('timer.finished')}${taskTitleStr}`;

    let shouldShowToast = false;
    let fallbackMsg = `${t('timer.finished')}${taskTitleStr}`;
    let fallbackType: 'info' | 'error' | 'warning' | 'success' = 'info';

    if (settings.sound.enabled) {
      playAlarm(settings.sound.volume).then((soundRes) => {
        if (soundRes === 'blocked') {
          setToastMessage(t('timer.soundBlocked'));
          setToastType('warning');
        }
      });
    }

    if (settings.notifications.enabled) {
      const notifRes = notify(notifTitle, notifBody);
      if (notifRes !== 'shown') {
        shouldShowToast = true;
        if (notifRes === 'denied') {
          fallbackMsg = t('timer.notificationsBlocked');
          fallbackType = 'warning';
        }
      }
    } else {
      shouldShowToast = true;
    }

    if (shouldShowToast) {
      setToastMessage(fallbackMsg);
      setToastType(fallbackType);
    }

    useAppStore.getState().acknowledgeCompletion();
  }, [lastCompletion, settings, tasks, t]);

  if (!toastMessage) return null;

  return (
    <Toast
      message={toastMessage}
      type={toastType}
      onClose={() => setToastMessage(null)}
      closeLabel={t('action.close')}
    />
  );
}
