export type EnPlural = {
  one: string;
  other: string;
};

export type ArPlural = {
  zero: string;
  one: string;
  two: string;
  few: string;
  many: string;
  other: string;
};

export const en = {
  'app.name': 'Study Tracker',
  'nav.dashboard': 'Dashboard',
  'nav.progress': 'Progress',
  'nav.analytics': 'Analytics',
  'nav.settings': 'Settings',
  'theme.toggle': 'Toggle theme',
  'theme.dark': 'Dark',
  'theme.light': 'Light',
  'lang.toggle': 'Toggle language',
  'lang.en': 'English',
  'lang.ar': 'العربية',
  'action.close': 'Close',
  'action.cancel': 'Cancel',
  'action.save': 'Save',
  'action.delete': 'Delete',
  'action.confirm': 'Confirm',
  'toast.dataRecovered': 'Saved data could not be read and was reset.',
  'placeholder.dashboard': 'Nothing on the tape yet. Start a timer.',
  'placeholder.progress': 'No progress records available.',
  'placeholder.analytics': 'No analytics available.',
  'placeholder.settings': 'Settings configuration.',
  'tasks.count': {
    one: '{count} task',
    other: '{count} tasks',
  },
} as const;

export type TranslationKeys = keyof typeof en;

export type TranslationValue = string | EnPlural;
export type ArabicTranslationValue<T> = T extends EnPlural ? ArPlural : string;

export type ArabicTranslations = {
  [K in TranslationKeys]: ArabicTranslationValue<(typeof en)[K]>;
};
