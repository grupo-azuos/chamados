import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createThemeStore,
  initialTheme,
  readThemeCookie,
  saveTheme,
  themeCookieDomain,
} from './theme-cookie.util';

beforeEach(() => {
  localStorage.clear();
  document.cookie = 'azuos-theme=; Path=/; Max-Age=0';
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('shared theme cookie', () => {
  // feliz
  it('uses dark by default and migrates the previous browser preference', () => {
    expect(initialTheme()).toBe('dark');
    localStorage.setItem('azuos-theme', 'light');
    const store = createThemeStore();
    expect(store.read()).toBe('light');
    expect(readThemeCookie()).toBe('light');
  });
  it('gives the shared cookie priority over stale localStorage', () => {
    localStorage.setItem('azuos-theme', 'light');
    document.cookie = 'azuos-theme=dark; Path=/';
    expect(initialTheme()).toBe('dark');
  });
  it('shares the group domain across production and homologation', () => {
    expect(themeCookieDomain('rh.grupoazuos.com.br')).toBe('grupoazuos.com.br');
    expect(themeCookieDomain('chamados.homo.grupoazuos.com.br')).toBe('grupoazuos.com.br');
    expect(themeCookieDomain('rh.local.test', '.local.test')).toBe('local.test');
  });
  // triste
  it('does not widen localhost, IPs or look-alike hosts to another domain', () => {
    for (const host of [
      'localhost',
      '127.0.0.1',
      'grupoazuos.com.br.evil.test',
      'fakegrupoazuos.com.br',
    ]) {
      expect(themeCookieDomain(host)).toBeNull();
    }
    expect(themeCookieDomain('rh.local.test', 'other.test')).toBeNull();
  });
  it('ignores malformed preferences', () => {
    document.cookie = 'azuos-theme=purple; Path=/';
    localStorage.setItem('azuos-theme', 'invalid');
    expect(initialTheme()).toBe('dark');
  });
  it('keeps cookies usable when localStorage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Blocked');
    });
    expect(() => saveTheme('light')).not.toThrow();
    expect(readThemeCookie()).toBe('light');
  });
  it('updates mounted subscribers when another system changes the cookie', () => {
    vi.useFakeTimers();
    const store = createThemeStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    document.cookie = 'azuos-theme=light; Path=/';
    window.dispatchEvent(new Event('focus'));
    expect(store.read()).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(listener).toHaveBeenCalledOnce();
    document.cookie = 'azuos-theme=dark; Path=/';
    vi.advanceTimersByTime(2000);
    expect(store.read()).toBe('dark');
    unsubscribe();
    expect(vi.getTimerCount()).toBe(0);
  });
});
