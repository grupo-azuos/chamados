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

describe('shared theme cookie — blocked cookies and the subscription life cycle', () => {
  // triste
  it('answers nothing when the cookie jar cannot be read', () => {
    const descriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie')!;
    Object.defineProperty(document, 'cookie', {
      configurable: true,
      get: () => {
        throw new Error('Blocked');
      },
      set: () => undefined,
    });
    try {
      expect(readThemeCookie()).toBeNull();
      expect(() => saveTheme('light')).not.toThrow();
    } finally {
      Object.defineProperty(document, 'cookie', descriptor);
    }
  });

  // feliz
  it('starts listening once for many subscribers and stops with the last one', () => {
    vi.useFakeTimers();
    const store = createThemeStore();
    const first = vi.fn();
    const second = vi.fn();
    const stopFirst = store.subscribe(first);
    const stopSecond = store.subscribe(second);
    const timersWhileListening = vi.getTimerCount();

    /* Sem cookie compartilhado, sincronizar não muda nada; o mesmo valor não acorda ninguém. */
    document.cookie = 'azuos-theme=; Path=/; Max-Age=0';
    window.dispatchEvent(new Event('pageshow'));
    store.write(store.read());
    expect(first).not.toHaveBeenCalled();

    document.cookie = 'azuos-theme=light; Path=/';
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(store.read()).toBe('dark');
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(store.read()).toBe('light');
    expect(second).toHaveBeenCalledOnce();

    /* O relógio só para com o último inscrito. */
    stopFirst();
    expect(vi.getTimerCount()).toBe(timersWhileListening);
    stopSecond();
    expect(vi.getTimerCount()).toBeLessThan(timersWhileListening);
  });
});

describe('shared theme cookie — on the group domain over https', () => {
  // feliz
  it('writes the cookie for the whole group, secured, when served from a group address', () => {
    const descriptor = Object.getOwnPropertyDescriptor(window, 'location');
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, hostname: 'chamados.grupoazuos.com.br', protocol: 'https:' },
    });
    const cookies: string[] = [];
    const cookieDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie')!;
    Object.defineProperty(document, 'cookie', {
      configurable: true,
      get: () => '',
      set: (value: string) => {
        cookies.push(value);
      },
    });
    try {
      saveTheme('light');
      expect(cookies[0]).toContain('Max-Age=0');
      expect(cookies[1]).toContain('Secure');
      expect(cookies[1]).toContain('Domain=grupoazuos.com.br');
    } finally {
      Object.defineProperty(document, 'cookie', cookieDescriptor);
      if (descriptor) Object.defineProperty(window, 'location', descriptor);
    }
  });
});

describe('shared theme cookie — outside the browser', () => {
  // triste
  /* No servidor não há `document` nem `window`: cada função devolve o padrão sem tocar em nada. */
  it('falls back to dark and does nothing without a document or a window', () => {
    vi.stubGlobal('document', undefined);
    vi.stubGlobal('window', undefined);
    try {
      expect(readThemeCookie()).toBeNull();
      expect(initialTheme()).toBe('dark');
      expect(() => saveTheme('light')).not.toThrow();
      const store = createThemeStore();
      expect(store.read()).toBe('dark');
      const unsubscribe = store.subscribe(() => undefined);
      expect(() => unsubscribe()).not.toThrow();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
