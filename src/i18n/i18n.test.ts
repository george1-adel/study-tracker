import { describe, it, expect, beforeEach } from 'vitest';
import { t, setLanguage } from './index';
import { en } from './en';
import { ar } from './ar';

describe('i18n', () => {
  beforeEach(() => {
    setLanguage('en');
  });

  it('returns the English string by default', () => {
    expect(t('app.name')).toBe('Study Tracker');
  });

  it('returns the Arabic string when language is ar', () => {
    setLanguage('ar');
    expect(t('app.name')).toBe('متتبع الدراسة');
  });

  it('ensures every key in en.ts exists in ar.ts', () => {
    const enKeys = Object.keys(en) as (keyof typeof en)[];
    const arKeys = Object.keys(ar);

    enKeys.forEach((key) => {
      expect(arKeys).toContain(key);
      expect(ar[key]).toBeDefined();
      expect(typeof ar[key]).toBe('string');
    });
  });
});
