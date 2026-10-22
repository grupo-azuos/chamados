import { createThemeStore } from './theme-cookie.util';

export type { Theme } from './theme-cookie.util';

const store = createThemeStore();
let theme = $state(store.read());

// É uma preferência da aplicação inteira, sem estado compartilhado no servidor.
if (typeof window !== 'undefined') {
  const unsubscribe = store.subscribe(() => {
    theme = store.read();
  });
  import.meta.hot?.dispose(unsubscribe);
}

export function useThemeModel() {
  return {
    get theme() {
      return theme;
    },
    actions: { onToggle: () => store.write(store.read() === 'dark' ? 'light' : 'dark') },
  };
}
