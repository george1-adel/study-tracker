import { useAppStore } from '../../store/useAppStore';
import { useTimerTick } from '../timer/useTimerTick';
import { dayKeyFromTimestamp } from '../../domain/time/dayKey';
import { buildDayLane, getLaneBounds, formatClockTime } from '../../domain/tape/layout';
import { formatDuration } from '../../domain/time/format';
import { t } from '../../i18n';
import { Tape } from '../../components/Tape';
import type { Session } from '../../domain/types';

export function TodayTape() {
  const sessions = useAppStore((s) => s.sessions);
  const settings = useAppStore((s) => s.settings);
  const activeTimer = useAppStore((s) => s.activeTimer);
  const language = settings.language;

  // Subscribes to tick ONLY while timer runs
  useTimerTick();

  const now = Date.now();
  const todayKey = dayKeyFromTimestamp(now, settings.dayStartHour);
  const { laneStartMs } = getLaneBounds(todayKey, settings.dayStartHour);

  const laneDurationMs = 24 * 3600_000;
  const playheadFrac = Math.min(1, Math.max(0, (now - laneStartMs) / laneDurationMs));

  const allSessions: Session[] = [...sessions];

  if (activeTimer) {
    const elapsed =
      activeTimer.accumulatedMs +
      (activeTimer.status === 'running' ? Math.max(0, now - activeTimer.startedAt) : 0);

    const liveStartTs = now - elapsed;

    allSessions.push({
      id: 'active-timer-session',
      taskId: activeTimer.taskId,
      kind: activeTimer.kind,
      startedAt: liveStartTs,
      endedAt: now,
      durationMs: elapsed,
      dayKey: todayKey,
      completed: false,
    });
  }

  const blocks = buildDayLane(allSessions, todayKey, settings.dayStartHour);

  const focusBlocks = blocks.filter((b) => b.isFocus);
  const focusCount = focusBlocks.length;
  let focusMs = 0;
  for (const b of focusBlocks) {
    focusMs += b.widthFrac * laneDurationMs;
  }

  let ariaSummary = '';
  if (focusCount === 0) {
    ariaSummary = t('placeholder.dashboard');
  } else {
    const focusDurationStr = formatDuration(focusMs, language === 'ar' ? 'ar-u-nu-latn' : 'en');
    const focusCountText = t('tape.focusCount', { count: focusCount });

    const sorted = [...allSessions].sort((a, b) => b.startedAt - a.startedAt);
    const mostRecent = sorted[0];

    if (mostRecent) {
      const recentStartStr = formatClockTime(mostRecent.startedAt, language);
      const recentEndStr = formatClockTime(mostRecent.endedAt, language);
      ariaSummary = `${focusCountText}, ${focusDurationStr}, ${t('tape.mostRecent', { start: recentStartStr, end: recentEndStr })}`;
    } else {
      ariaSummary = `${focusCountText}, ${focusDurationStr}`;
    }
  }

  const emptyText = t('placeholder.dashboard');

  return (
    <Tape
      zoom="day"
      lanes={[{ dayKey: todayKey, blocks }]}
      now={now}
      playheadFrac={playheadFrac}
      ariaSummary={ariaSummary}
      emptyText={emptyText}
      locale={language}
    />
  );
}
