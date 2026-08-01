export function getSeriesColor(
  colorType?: 'focus' | 'break' | 'neutral',
  customColor?: string
): string {
  if (customColor) return customColor;
  if (colorType === 'focus') return 'var(--trace)';
  if (colorType === 'break') return 'var(--breath)';
  return 'var(--text-muted)';
}
