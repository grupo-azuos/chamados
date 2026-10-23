import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const STORAGE_KEY = 'azuos-theme';

/** O tema mora num `$state` de escopo de módulo — cada teste precisa de um módulo novo, senão
 * herda o valor deixado pelo teste anterior. */
async function freshTheme() {
  vi.resetModules();

  return import('./theme.svelte');
}

beforeEach(() => {
  window.localStorage.clear();
  document.cookie = 'azuos-theme=; Path=/; Max-Age=0';
  document.documentElement.removeAttribute('data-theme');
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('useThemeModel', () => {
  // feliz
  it('starts in dark mode when no preference is saved', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia,
    );
    const { useThemeModel } = await freshTheme();

    expect(useThemeModel().theme).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('alterna entre claro e escuro e guarda a escolha', async () => {
    localStorage.setItem(STORAGE_KEY, 'light');
    const { useThemeModel } = await freshTheme();
    const theme = useThemeModel();

    theme.actions.onToggle();
    expect(theme.theme).toBe('dark');
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    theme.actions.onToggle();
    expect(theme.theme).toBe('light');
  });

  it('respects a saved theme preference', async () => {
    window.localStorage.setItem(STORAGE_KEY, 'dark');
    const { useThemeModel } = await freshTheme();

    expect(useThemeModel().theme).toBe('dark');
  });

  // triste
  it('ignores an invalid saved value and falls back to dark mode', async () => {
    window.localStorage.setItem(STORAGE_KEY, 'catppuccin-mocha');
    const { useThemeModel } = await freshTheme();

    expect(useThemeModel().theme).toBe('dark');
  });

  it('keeps the theme usable when browser storage is blocked', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Storage unavailable', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage unavailable', 'SecurityError');
    });
    const { useThemeModel } = await freshTheme();
    const theme = useThemeModel();

    expect(theme.theme).toBe('dark');
    expect(() => theme.actions.onToggle()).not.toThrow();
    expect(theme.theme).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});
