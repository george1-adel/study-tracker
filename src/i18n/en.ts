export const en = {
  'app.name': 'Study Tracker',
} as const;

export type TranslationKeys = keyof typeof en;
export type Translations = Record<TranslationKeys, string>;
