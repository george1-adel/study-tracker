import { useCallback } from 'react';
import { en, type TranslationKeys } from './en';
import { ar } from './ar';
import { useAppStore } from '../store/useAppStore';

export type Language = 'en' | 'ar';

let currentLanguage: Language = 'en';

export function setLanguage(lang: Language): void {
  currentLanguage = lang;
}

export function getLanguage(): Language {
  return currentLanguage;
}

export function dir(lang: Language = currentLanguage): 'rtl' | 'ltr' {
  return lang === 'ar' ? 'rtl' : 'ltr';
}

export function getPluralCategory(locale: Language, count: number): string {
  const pr = new Intl.PluralRules(locale === 'ar' ? 'ar' : 'en');
  return pr.select(count);
}

export function t(
  key: TranslationKeys,
  params?: Record<string, string | number>,
  overrideLang?: Language
): string {
  const lang = overrideLang ?? currentLanguage;
  const dict = lang === 'ar' ? ar : en;
  const rawEntry = dict[key] ?? en[key];

  let template: string;
  if (typeof rawEntry === 'string') {
    template = rawEntry;
  } else if (rawEntry && typeof rawEntry === 'object') {
    const count = typeof params?.count === 'number' ? params.count : 0;
    const category = getPluralCategory(lang, count);
    const map = rawEntry as Record<string, string>;
    template = map[category] ?? map['other'] ?? '';
  } else {
    template = key;
  }

  if (!params) return template;

  return template.replace(/\{(\w+)\}/g, (_, pKey) => {
    return pKey in params ? String(params[pKey]) : `{${pKey}}`;
  });
}

export function useT() {
  const language = useAppStore((s) => s.settings.language);
  return useCallback(
    (key: TranslationKeys, params?: Record<string, string | number>) => {
      return t(key, params, language);
    },
    [language]
  );
}

export type { TranslationKeys };
