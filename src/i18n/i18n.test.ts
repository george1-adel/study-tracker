import { describe, it, expect, beforeEach } from 'vitest';
import { t, setLanguage } from './index';
import { en } from './en';
import { ar } from './ar';

describe('i18n', () => {
  beforeEach(() => {
    setLanguage('en');
  });

  it('returns English string by default', () => {
    expect(t('app.name')).toBe('Study Tracker');
  });

  it('returns Arabic string when language is ar', () => {
    setLanguage('ar');
    expect(t('app.name')).toBe('متتبع الدراسة');
  });

  it('ensures every key in en.ts exists in ar.ts', () => {
    const enKeys = Object.keys(en) as (keyof typeof en)[];
    const arKeys = Object.keys(ar);

    enKeys.forEach((key) => {
      expect(arKeys).toContain(key);
      expect(ar[key]).toBeDefined();
    });
  });

  it('handles interpolation in t()', () => {
    expect(t('tasks.count', { count: 5 }, 'en')).toBe('5 tasks');
  });

  it('handles plural selection for English', () => {
    expect(t('tasks.count', { count: 1 }, 'en')).toBe('1 task');
    expect(t('tasks.count', { count: 0 }, 'en')).toBe('0 tasks');
    expect(t('tasks.count', { count: 2 }, 'en')).toBe('2 tasks');
  });

  it('handles plural selection for Arabic (6 categories)', () => {
    expect(t('tasks.count', { count: 0 }, 'ar')).toBe('لا توجد مهمات');
    expect(t('tasks.count', { count: 1 }, 'ar')).toBe('مهمة واحدة');
    expect(t('tasks.count', { count: 2 }, 'ar')).toBe('مهمتان');
    expect(t('tasks.count', { count: 3 }, 'ar')).toBe('3 مهمات');
    expect(t('tasks.count', { count: 11 }, 'ar')).toBe('11 مهمة');
    expect(t('tasks.count', { count: 100 }, 'ar')).toBe('100 مهمة');
  });
});
