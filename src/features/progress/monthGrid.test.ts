import { describe, it, expect } from 'vitest';
import { buildMonthGrid, addMonths, getWeekdayLabels } from './monthGrid';

describe('monthGrid helper', () => {
  it('exercises 28-day month (Feb 2026) across weekStartsOn 0, 1, 6', () => {
    // Feb 1, 2026 is Sunday (weekday 0)
    // weekStartsOn 0 (Sun): 0 leading, 28 days, 0 trailing -> 28 total
    const gridSun = buildMonthGrid('2026-02', 0);
    expect(gridSun.daysInMonth).toBe(28);
    expect(gridSun.leadingBlanks).toBe(0);
    expect(gridSun.trailingBlanks).toBe(0);
    expect(gridSun.totalCells).toBe(28);

    // weekStartsOn 1 (Mon): 6 leading, 28 days, 1 trailing -> 35 total
    const gridMon = buildMonthGrid('2026-02', 1);
    expect(gridMon.daysInMonth).toBe(28);
    expect(gridMon.leadingBlanks).toBe(6);
    expect(gridMon.trailingBlanks).toBe(1);
    expect(gridMon.totalCells).toBe(35);

    // weekStartsOn 6 (Sat): 1 leading, 28 days, 6 trailing -> 35 total
    const gridSat = buildMonthGrid('2026-02', 6);
    expect(gridSat.daysInMonth).toBe(28);
    expect(gridSat.leadingBlanks).toBe(1);
    expect(gridSat.trailingBlanks).toBe(6);
    expect(gridSat.totalCells).toBe(35);
  });

  it('exercises 29-day leap month (Feb 2028) across weekStartsOn 0, 1, 6', () => {
    // Feb 1, 2028 is Tuesday (weekday 2)
    // weekStartsOn 0 (Sun): 2 leading, 29 days, 4 trailing -> 35 total
    const gridSun = buildMonthGrid('2028-02', 0);
    expect(gridSun.daysInMonth).toBe(29);
    expect(gridSun.leadingBlanks).toBe(2);
    expect(gridSun.trailingBlanks).toBe(4);
    expect(gridSun.totalCells).toBe(35);

    // weekStartsOn 1 (Mon): 1 leading, 29 days, 5 trailing -> 35 total
    const gridMon = buildMonthGrid('2028-02', 1);
    expect(gridMon.daysInMonth).toBe(29);
    expect(gridMon.leadingBlanks).toBe(1);
    expect(gridMon.trailingBlanks).toBe(5);
    expect(gridMon.totalCells).toBe(35);

    // weekStartsOn 6 (Sat): 3 leading, 29 days, 3 trailing -> 35 total
    const gridSat = buildMonthGrid('2028-02', 6);
    expect(gridSat.daysInMonth).toBe(29);
    expect(gridSat.leadingBlanks).toBe(3);
    expect(gridSat.trailingBlanks).toBe(3);
    expect(gridSat.totalCells).toBe(35);
  });

  it('exercises 30-day month (Apr 2026) across weekStartsOn 0, 1, 6', () => {
    // Apr 1, 2026 is Wednesday (weekday 3)
    const gridMon = buildMonthGrid('2026-04', 1);
    expect(gridMon.daysInMonth).toBe(30);
    expect(gridMon.leadingBlanks).toBe(2);
    expect(gridMon.trailingBlanks).toBe(3);
    expect(gridMon.totalCells).toBe(35);
  });

  it('exercises 31-day month (Mar 2026) across weekStartsOn 0, 1, 6', () => {
    // Mar 1, 2026 is Sunday (weekday 0)
    const gridMon = buildMonthGrid('2026-03', 1);
    expect(gridMon.daysInMonth).toBe(31);
    expect(gridMon.leadingBlanks).toBe(6);
    expect(gridMon.trailingBlanks).toBe(5);
    expect(gridMon.totalCells).toBe(42);
  });

  it('adds months correctly', () => {
    expect(addMonths('2026-01', 1)).toBe('2026-02');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(addMonths('2026-12', 1)).toBe('2027-01');
  });

  it('generates weekday labels for each weekStartsOn setting', () => {
    const labelsMon = getWeekdayLabels(1, 'en');
    expect(labelsMon.length).toBe(7);
    expect(labelsMon[0]).toContain('Mon');

    const labelsSun = getWeekdayLabels(0, 'en');
    expect(labelsSun[0]).toContain('Sun');

    const labelsSat = getWeekdayLabels(6, 'en');
    expect(labelsSat[0]).toContain('Sat');
  });
});
