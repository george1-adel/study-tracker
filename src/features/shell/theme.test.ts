import { describe, it, expect } from 'vitest';
import { useAppStore } from '../../store/useAppStore';
import { initThemeAndDirection } from './theme';

describe('Theme & Direction Plumbing', () => {
  it('updates html data-theme when settings.theme changes', () => {
    const cleanup = initThemeAndDirection();
    useAppStore.getState().updateSettings({ theme: 'light' });
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    useAppStore.getState().updateSettings({ theme: 'dark' });
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    cleanup();
  });

  it('sets html dir="rtl" when language is ar', () => {
    const cleanup = initThemeAndDirection();
    useAppStore.getState().updateSettings({ language: 'ar' });
    expect(document.documentElement.getAttribute('dir')).toBe('rtl');
    expect(document.documentElement.getAttribute('lang')).toBe('ar');

    useAppStore.getState().updateSettings({ language: 'en' });
    expect(document.documentElement.getAttribute('dir')).toBe('ltr');
    expect(document.documentElement.getAttribute('lang')).toBe('en');
    cleanup();
  });
});
