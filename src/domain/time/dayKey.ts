export type DayKey = string; // "YYYY-MM-DD", a LOCAL calendar day

const pad2 = (n: number): string => String(n).padStart(2, '0');
const pad4 = (n: number): string => String(n).padStart(4, '0');

export function parseDayKey(key: DayKey): { year: number; month: number; day: number } {
  const [yStr = '', mStr = '', dStr = ''] = key.split('-');
  return {
    year: parseInt(yStr, 10),
    month: parseInt(mStr, 10),
    day: parseInt(dStr, 10),
  };
}

export function isValidDayKey(value: unknown): value is DayKey {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const { year, month, day } = parseDayKey(value);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }
  const d = new Date(year, month - 1, day, 12, 0, 0, 0);
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
}

export function dayKeyFromTimestamp(ts: number, dayStartHour: number): DayKey {
  const shifted = ts - dayStartHour * 3600_000;
  const d = new Date(shifted);
  return `${pad4(d.getFullYear())}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function dayKeyToNoonTimestamp(key: DayKey): number {
  const { year, month, day } = parseDayKey(key);
  return new Date(year, month - 1, day, 12, 0, 0, 0).getTime();
}

export function addDays(key: DayKey, delta: number): DayKey {
  const noonTs = dayKeyToNoonTimestamp(key);
  const targetNoonTs = noonTs + delta * 86_400_000;
  const d = new Date(targetNoonTs);
  return `${pad4(d.getFullYear())}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function diffDays(from: DayKey, to: DayKey): number {
  const fromNoon = dayKeyToNoonTimestamp(from);
  const toNoon = dayKeyToNoonTimestamp(to);
  return Math.round((toNoon - fromNoon) / 86_400_000);
}

export function compareDayKeys(a: DayKey, b: DayKey): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

export function enumerateDays(from: DayKey, to: DayKey): DayKey[] {
  if (compareDayKeys(from, to) > 0) {
    return [];
  }
  const count = diffDays(from, to);
  const result: DayKey[] = [];
  for (let i = 0; i <= count; i++) {
    result.push(addDays(from, i));
  }
  return result;
}

export function weekdayIndex(key: DayKey): number {
  const date = new Date(dayKeyToNoonTimestamp(key));
  return date.getDay();
}

export function startOfWeek(key: DayKey, weekStartsOn: 0 | 1 | 6): DayKey {
  const w = weekdayIndex(key);
  const diff = (w - weekStartsOn + 7) % 7;
  return addDays(key, -diff);
}

export function endOfWeek(key: DayKey, weekStartsOn: 0 | 1 | 6): DayKey {
  return addDays(startOfWeek(key, weekStartsOn), 6);
}

export function startOfMonth(key: DayKey): DayKey {
  const { year, month } = parseDayKey(key);
  return `${pad4(year)}-${pad2(month)}-01`;
}

export function endOfMonth(key: DayKey): DayKey {
  const { year, month } = parseDayKey(key);
  const nextMonthYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const startOfNextMonth: DayKey = `${pad4(nextMonthYear)}-${pad2(nextMonth)}-01`;
  return addDays(startOfNextMonth, -1);
}

export function monthKey(key: DayKey): string {
  return key.slice(0, 7);
}
