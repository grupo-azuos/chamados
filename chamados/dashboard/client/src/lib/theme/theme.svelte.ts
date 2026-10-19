/**
 * O tema claro/escuro da tela — o MESMO mecanismo do agente (`chamados/agent/svelte/src/lib/theme`):
 * um atributo `data-theme` no `<html>`, guardado no `localStorage` para sobreviver ao fechar o
 * navegador.
 *
 * Mora fora de `lib/hooks/` de propósito: não é o estado de UMA tela, é uma preferência do
 * sistema inteiro — por isso o `$state` vive no escopo do MÓDULO (uma vez só, compartilhado por
 * quem importar), e não dentro de uma função que cada rota chamaria com a própria cópia.
 */

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'azuos-theme';

/** Nada salvo ainda? O sistema começa no tema claro, independentemente do tema do dispositivo. */
function loadInitial(): Theme {
  if (typeof window === 'undefined') return 'light';

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    return 'light';
  }

  return 'light';
}

function apply(theme: Theme): void {
  if (typeof document === 'undefined') return;

  document.documentElement.setAttribute('data-theme', theme);
}

function save(theme: Theme): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Armazenamento bloqueado não impede trocar o tema na sessão atual.
    return;
  }
}

let theme = $state<Theme>(loadInitial());
apply(theme);

export function useThemeModel() {
  return {
    get theme() {
      return theme;
    },
    actions: {
      onToggle: () => {
        theme = theme === 'dark' ? 'light' : 'dark';
        save(theme);
        apply(theme);
      },
    },
  };
}
