import { useAppStore } from '../../store/useAppStore';
import { setLanguage, dir } from '../../i18n';

export function syncThemeAndDirection(): void {
  const state = useAppStore.getState();
  const theme = state.settings.theme;
  const language = state.settings.language;

  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  root.setAttribute('lang', language);
  root.setAttribute('dir', dir(language));
  setLanguage(language);
}

export function initThemeAndDirection(): () => void {
  syncThemeAndDirection();

  return useAppStore.subscribe((state, prevState) => {
    if (
      state.settings.theme !== prevState.settings.theme ||
      state.settings.language !== prevState.settings.language
    ) {
      const root = document.documentElement;
      root.setAttribute('data-theme', state.settings.theme);
      root.setAttribute('lang', state.settings.language);
      root.setAttribute('dir', dir(state.settings.language));
      setLanguage(state.settings.language);
    }
  });
}
