import {
  parseDayKey,
  startOfMonth,
  endOfMonth,
  weekdayIndex,
  type DayKey,
} from '../../domain/time/dayKey';

export interface MonthGridCell {
  type: 'blank' | 'day';
  dayKey?: DayKey;
  dayNumber?: number;
}

export interface MonthGridInfo {
  monthKeyStr: string; // "YYYY-MM"
  leadingBlanks: number;
  daysInMonth: number;
  trailingBlanks: number;
  totalCells: number;
  cells: MonthGridCell[];
}

export function buildMonthGrid(
  monthKeyStr: string,
  weekStartsOn: 0 | 1 | 6 = 1
): MonthGridInfo {
  const firstDayKey: DayKey = monthKeyStr.length === 7 ? `${monthKeyStr}-01` : monthKeyStr;
  const startKey = startOfMonth(firstDayKey);
  const lastKey = endOfMonth(startKey);
  const daysInMonth = parseDayKey(lastKey).day;
  const firstDayWeekday = weekdayIndex(startKey);

  const leadingBlanks = (firstDayWeekday - weekStartsOn + 7) % 7;
  const trailingBlanks = (7 - ((leadingBlanks + daysInMonth) % 7)) % 7;
  const totalCells = leadingBlanks + daysInMonth + trailingBlanks;

  const cells: MonthGridCell[] = [];

  for (let i = 0; i < leadingBlanks; i++) {
    cells.push({ type: 'blank' });
  }

  const [yearStr, monthStr] = startKey.split('-');
  for (let d = 1; d <= daysInMonth; d++) {
    const dayStr = String(d).padStart(2, '0');
    const dayKey: DayKey = `${yearStr}-${monthStr}-${dayStr}`;
    cells.push({
      type: 'day',
      dayKey,
      dayNumber: d,
    });
  }

  for (let i = 0; i < trailingBlanks; i++) {
    cells.push({ type: 'blank' });
  }

  return {
    monthKeyStr: startKey.slice(0, 7),
    leadingBlanks,
    daysInMonth,
    trailingBlanks,
    totalCells,
    cells,
  };
}

export function addMonths(monthKeyStr: string, delta: number): string {
  const [yStr = '2026', mStr = '01'] = monthKeyStr.split('-');
  let year = parseInt(yStr, 10);
  let month = parseInt(mStr, 10) + delta;

  while (month < 1) {
    month += 12;
    year -= 1;
  }
  while (month > 12) {
    month -= 12;
    year += 1;
  }

  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`;
}

export function getWeekdayLabels(weekStartsOn: 0 | 1 | 6, locale: string): string[] {
  const baseSunday = new Date(2026, 2, 1, 12, 0, 0, 0).getTime();
  const labels: string[] = [];
  const loc = locale === 'ar' ? 'ar-u-nu-latn' : locale;
  const dtf = new Intl.DateTimeFormat(loc, { weekday: 'short' });

  for (let i = 0; i < 7; i++) {
    const dayIndex = (weekStartsOn + i) % 7;
    const ts = baseSunday + dayIndex * 86_400_000;
    labels.push(dtf.format(ts));
  }
  return labels;
}
