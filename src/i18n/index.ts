import { en, type TranslationKeys } from './en';
import { ar } from './ar';

export type Language = 'en' | 'ar';

let currentLanguage: Language = 'en';

export function setLanguage(lang: Language): void {
  currentLanguage = lang;
}

export function getLanguage(): Language {
  return currentLanguage;
}

export function t(key: TranslationKeys): string {
  const dictionary = currentLanguage === 'ar' ? ar : en;
  return dictionary[key] ?? en[key];
}
