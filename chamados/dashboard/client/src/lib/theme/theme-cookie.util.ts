export type Theme = 'light' | 'dark';

const KEY = 'azuos-theme';
const GROUP_DOMAIN = 'grupoazuos.com.br';
const MAX_AGE = 365 * 24 * 60 * 60;

function parseTheme(value: string | null | undefined): Theme | null {
  return value === 'light' || value === 'dark' ? value : null;
}

/** Um domínio explícito atende instalações próprias; localhost e IP ficam host-only. */
export function themeCookieDomain(hostname: string, configured = ''): string | null {
  const domain = configured.trim().replace(/^\./, '').toLowerCase();
  const candidate = domain || GROUP_DOMAIN;
  if (hostname === candidate || hostname.endsWith(`.${candidate}`)) return candidate;

  return null;
}

export function readThemeCookie(): Theme | null {
  if (typeof document === 'undefined') return null;
  try {
    const cookie = document.cookie
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${KEY}=`));
    return parseTheme(cookie?.slice(KEY.length + 1));
  } catch {
    return null;
  }
}

/** O cookie compartilhado sempre vence uma preferência antiga deste subdomínio. */
export function initialTheme(): Theme {
  const shared = readThemeCookie();
  if (shared) return shared;
  if (typeof window === 'undefined') return 'dark';
  try {
    return parseTheme(window.localStorage.getItem(KEY)) ?? 'dark';
  } catch {
    return 'dark';
  }
}

export function saveTheme(theme: Theme): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  try {
    const domain = themeCookieDomain(
      window.location.hostname,
      import.meta.env.VITE_THEME_COOKIE_DOMAIN,
    );
    const attributes = `Path=/; Max-Age=${MAX_AGE}; SameSite=Lax${window.location.protocol === 'https:' ? '; Secure' : ''}`;
    // Remove a versão host-only antiga antes de gravar a preferência do grupo.
    if (domain) document.cookie = `${KEY}=; Path=/; Max-Age=0`;
    document.cookie = `${KEY}=${theme}; ${attributes}${domain ? `; Domain=${domain}` : ''}`;
  } catch {
    // Uma política de cookies restritiva não impede usar o tema nesta aba.
  }
  try {
    window.localStorage.setItem(KEY, theme);
  } catch {
    // O cookie é a fonte compartilhada; localStorage serve apenas à migração e ao fallback.
  }
}

function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
}

/** Cookies não emitem eventos entre origens: sincroniza ao voltar e enquanto a aba está visível. */
export function createThemeStore() {
  let current = initialTheme();
  const listeners = new Set<() => void>();
  let stop: (() => void) | undefined;
  applyTheme(current);
  if (typeof window !== 'undefined') saveTheme(current);

  function update(value: Theme): void {
    if (value === current) return;
    current = value;
    applyTheme(value);
    for (const listener of [...listeners]) listener();
  }

  function sync(): void {
    const shared = readThemeCookie();
    if (shared) update(shared);
  }

  function start(): () => void {
    if (typeof window === 'undefined') return () => undefined;
    const onVisible = () => {
      if (document.visibilityState === 'visible') sync();
    };
    window.addEventListener('focus', sync);
    window.addEventListener('pageshow', sync);
    document.addEventListener('visibilitychange', onVisible);
    const timer = window.setInterval(onVisible, 2000);
    return () => {
      window.removeEventListener('focus', sync);
      window.removeEventListener('pageshow', sync);
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(timer);
    };
  }

  return {
    read: () => current,
    write: (value: Theme) => {
      saveTheme(value);
      update(value);
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      if (listeners.size === 1) stop = start();
      sync();
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          stop?.();
          stop = undefined;
        }
      };
    },
  };
}
