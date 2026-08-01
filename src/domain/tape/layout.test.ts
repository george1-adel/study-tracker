import { describe, it, expect } from 'vitest';
import {
  buildDayLane,
  buildMonthLanes,
  buildYearIntensity,
  MIN_VISIBLE_WIDTH_FRAC,
  getLaneBounds,
  formatBlockTooltip,
} from './layout';
import type { Session } from '../types';

describe('Tape Domain Layout', () => {
  const dayKey = '2026-03-14';

  function makeSession(
    id: string,
    startedAt: number,
    durationMs: number,
    kind: Session['kind'] = 'stopwatch'
  ): Session {
    return {
      id,
      taskId: 'task-1',
      kind,
      startedAt,
      endedAt: startedAt + durationMs,
      durationMs,
      dayKey,
      completed: true,
    };
  }

  it('formatBlockTooltip formats duration and clock range in both en and ar without %', () => {
    const startTs = new Date(2026, 2, 14, 1, 30).getTime();
    const endTs = new Date(2026, 2, 14, 2, 10).getTime();

    const tooltipEn = formatBlockTooltip('stopwatch', startTs, endTs, 'en');
    expect(tooltipEn).toBe('Focus - 40m, 01:30 to 02:10');
    expect(tooltipEn).not.toContain('%');

    const tooltipAr = formatBlockTooltip('stopwatch', startTs, endTs, 'ar');
    expect(tooltipAr).toBe('تركيز - 40m، 01:30 إلى 02:10');
    expect(tooltipAr).not.toContain('%');
  });

  it('a session at 00:00 has startFrac 0; at 12:00 startFrac 0.5; ending at 24:00 has startFrac + widthFrac === 1', () => {
    const { laneStartMs } = getLaneBounds(dayKey, 0);

    const sessionStart = makeSession('s-start', laneStartMs, 3600_000); // 00:00 to 01:00
    const sessionMid = makeSession('s-mid', laneStartMs + 12 * 3600_000, 3600_000); // 12:00 to 13:00
    const sessionEnd = makeSession('s-end', laneStartMs + 23 * 3600_000, 3600_000); // 23:00 to 24:00

    const blocks = buildDayLane([sessionStart, sessionMid, sessionEnd], dayKey, 0);

    expect(blocks[0]?.startFrac).toBe(0);
    expect(blocks[1]?.startFrac).toBe(0.5);
    expect((blocks[2]?.startFrac ?? 0) + (blocks[2]?.widthFrac ?? 0)).toBe(1);
  });

  it('a session crossing midnight is clipped at 1, not wrapped, and not dropped', () => {
    const { laneStartMs } = getLaneBounds(dayKey, 0);
    // Started at 22:00 on 2026-03-14, ends at 02:00 on 2026-03-15 (4 hours total)
    const session = makeSession('s-cross', laneStartMs + 22 * 3600_000, 4 * 3600_000);

    const blocksDay1 = buildDayLane([session], dayKey, 0);
    expect(blocksDay1).toHaveLength(1);
    expect(blocksDay1[0]?.startFrac).toBeCloseTo(22 / 24);
    expect(blocksDay1[0]?.widthFrac).toBeCloseTo(2 / 24);
    expect((blocksDay1[0]?.startFrac ?? 0) + (blocksDay1[0]?.widthFrac ?? 0)).toBe(1);

    // On day 2 (2026-03-15), the session did not start on this day, so it is not wrapped onto day 2
    const blocksDay2 = buildDayLane([session], '2026-03-15', 0);
    expect(blocksDay2).toHaveLength(0);
  });

  it('a 40-second session renders at the named minimum width, not zero', () => {
    const { laneStartMs } = getLaneBounds(dayKey, 0);
    const session40s = makeSession('s-short', laneStartMs + 10 * 3600_000, 40_000); // 40 seconds

    const blocks = buildDayLane([session40s], dayKey, 0);
    expect(blocks).toHaveLength(1);
    const rawWidth = 40_000 / (24 * 3600_000);
    expect(rawWidth).toBeLessThan(MIN_VISIBLE_WIDTH_FRAC);
    expect(blocks[0]?.widthFrac).toBe(MIN_VISIBLE_WIDTH_FRAC);
  });

  it('two overlapping sessions both survive', () => {
    const { laneStartMs } = getLaneBounds(dayKey, 0);
    const s1 = makeSession('s1', laneStartMs + 10 * 3600_000, 2 * 3600_000); // 10:00 to 12:00
    const s2 = makeSession('s2', laneStartMs + 11 * 3600_000, 2 * 3600_000); // 11:00 to 13:00

    const blocks = buildDayLane([s1, s2], dayKey, 0);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]?.sessionId).toBe('s1');
    expect(blocks[1]?.sessionId).toBe('s2');
  });

  it('dayStartHour = 4 shifts positions correctly (a 03:00 session belongs to the previous lane)', () => {
    const { laneStartMs: day00StartMs } = getLaneBounds(dayKey, 0);
    // Session at 03:00 on 2026-03-14 calendar day
    const session0300 = makeSession('s-0300', day00StartMs + 3 * 3600_000, 3600_000);

    // With dayStartHour = 4, 2026-03-14 lane runs 04:00 (14th) to 04:00 (15th)
    const blocksDay14 = buildDayLane([session0300], '2026-03-14', 4);
    expect(blocksDay14).toHaveLength(0); // 03:00 does not start on 2026-03-14 at dayStartHour=4

    // It belongs to 2026-03-13 lane (04:00 on 13th to 04:00 on 14th)
    const blocksDay13 = buildDayLane([session0300], '2026-03-13', 4);
    expect(blocksDay13).toHaveLength(1);
    expect(blocksDay13[0]?.startFrac).toBeCloseTo(23 / 24); // 03:00 is 23h after 04:00 start
  });

  it('empty input returns [] and buildYearIntensity returns all-null without NaN or -Infinity', () => {
    expect(buildDayLane([], dayKey, 0)).toEqual([]);

    const yearResult = buildYearIntensity([], '2026-03-01', '2026-03-05', 0);
    expect(yearResult).toHaveLength(5);
    yearResult.forEach((d) => {
      expect(d.intensity).toBeNull();
      expect(d.focusMs).toBe(0);
      expect(Number.isNaN(d.intensity)).toBe(false);
    });

    const invalidYearResult = buildYearIntensity([], '2026-03-05', '2026-03-01', 0);
    expect(invalidYearResult).toEqual([]);
  });

  it('buildYearIntensity scales against the max, and a single-day range does not divide by zero', () => {
    const { laneStartMs } = getLaneBounds('2026-03-01', 0);
    const s1 = makeSession('s1', laneStartMs + 10 * 3600_000, 2 * 3600_000); // 2 hours

    // Single day range with session
    const singleDayResult = buildYearIntensity([s1], '2026-03-01', '2026-03-01', 0);
    expect(singleDayResult).toHaveLength(1);
    expect(singleDayResult[0]?.intensity).toBe(1.0);

    // Multi day range
    const { laneStartMs: day2StartMs } = getLaneBounds('2026-03-02', 0);
    const s2 = makeSession('s2', day2StartMs + 10 * 3600_000, 1 * 3600_000); // 1 hour

    const multiDayResult = buildYearIntensity([s1, s2], '2026-03-01', '2026-03-03', 0);
    expect(multiDayResult).toHaveLength(3);
    expect(multiDayResult[0]?.intensity).toBe(1.0); // 2h (max)
    expect(multiDayResult[1]?.intensity).toBeCloseTo(0.5); // 1h
    expect(multiDayResult[2]?.intensity).toBeNull(); // 0h
  });

  it('month lanes: correct number of days for 28/29/30/31-day months', () => {
    expect(buildMonthLanes([], '2026-02', 0)).toHaveLength(28); // Feb 2026 non-leap
    expect(buildMonthLanes([], '2028-02', 0)).toHaveLength(29); // Feb 2028 leap year
    expect(buildMonthLanes([], '2026-04', 0)).toHaveLength(30); // Apr 2026
    expect(buildMonthLanes([], '2026-03', 0)).toHaveLength(31); // Mar 2026
  });
});
