import { goto } from '$app/navigation';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  currentStack,
  recordNavigation,
  resetNavigationStack,
  useBackTarget,
} from './use-navigation-stack.svelte';

const at = (path: string) => new URL(path, 'http://localhost');

/** Simula o navegador na posição `index` do histórico, como o SvelteKit grava. */
function historyAt(index: number) {
  window.history.replaceState({ 'sveltekit:history': index }, '');
}

beforeEach(() => resetNavigationStack());
afterEach(() => vi.restoreAllMocks());

describe('recordNavigation', () => {
  // feliz
  it('remembers the screen the person came from, and reuses it after a reload', () => {
    recordNavigation(at('/infra/computers/3'), { url: at('/infra/computers') }, 1);
    recordNavigation(at('/infra/tickets/7'), { url: at('/infra/computers/3') }, 2);

    expect(currentStack().map((item) => item.label)).toEqual(['o inventário', 'a máquina']);

    /* F5 na mesma entrada: a pilha volta do armazenamento, mesmo vindo "do nada". */
    resetNavigationStackKeepingStorage();
    recordNavigation(at('/infra/tickets/7'), null, 2);
    expect(currentStack().map((item) => item.pathname)).toEqual([
      '/infra/computers',
      '/infra/computers/3',
    ]);
  });

  // triste
  it('starts a new path at a menu screen and when the tab opens on a pasted link', () => {
    recordNavigation(at('/infra/tickets/7'), null, null);
    expect(currentStack()).toEqual([]);

    recordNavigation(at('/infra/tickets'), { url: at('/infra/tickets/7') }, 5);
    expect(currentStack()).toEqual([]);
  });

  // triste
  it('treats the opening of the tab, which SvelteKit sends as a place with no url, as no origin', () => {
    expect(() => recordNavigation(at('/infra/tickets/7'), { url: null }, null)).not.toThrow();
    expect(currentStack()).toEqual([]);
  });
});

describe('useBackTarget', () => {
  // feliz
  it('names the previous screen and goes back through the browser when it is right before', () => {
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {});
    recordNavigation(at('/infra/computers/3'), { url: at('/infra/computers') }, 1);
    recordNavigation(at('/infra/tickets/7'), { url: at('/infra/computers/3') }, 2);
    historyAt(2);

    const target = useBackTarget({ to: '/infra/tickets', destination: 'os chamados' });
    target.onBack();

    expect(target.destination).toBe('a máquina');
    expect(back).toHaveBeenCalledOnce();
  });

  // triste
  it('falls back to the natural place of the screen without a path', () => {
    const target = useBackTarget({ to: '/infra/tickets', destination: 'os chamados' });
    target.onBack();

    expect(target.destination).toBe('os chamados');
    expect(goto).toHaveBeenCalledWith('/infra/tickets');
  });
});

/** Zera só a pilha em memória, como uma página recarregada, sem apagar a `sessionStorage`. */
function resetNavigationStackKeepingStorage() {
  const saved = sessionStorage.getItem('navigation-stacks');
  resetNavigationStack();
  if (saved) sessionStorage.setItem('navigation-stacks', saved);
}
