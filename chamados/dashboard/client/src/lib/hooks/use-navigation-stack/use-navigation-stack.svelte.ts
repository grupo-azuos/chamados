import { afterNavigate, goto } from '$app/navigation';

import { NAV_ITEMS_BY_CONTEXT } from '$lib/navigation/navigation';
import {
  backEntryOf,
  type NavigationEntry,
  nextStack,
  parseStack,
  pathLabelOf,
} from '$lib/utils/navigation-stack.util';

/**
 * O "VOLTAR" DO SISTEMA COMO O DO NAVEGADOR — mas sabendo o nome de cada tela e sem sair do
 * sistema.
 *
 * Cada entrada do histórico do navegador ganha a pilha das telas por onde a pessoa passou até
 * ela (regras em `navigation-stack.util`). A pilha fica na `sessionStorage`, pela posição que o
 * SvelteKit dá a cada entrada do histórico: o F5 e o voltar/avançar do navegador reencontram a
 * pilha certa, e uma aba nova (ou um link colado) começa sem pilha e volta para o lugar natural
 * da tela.
 *
 * Duas peças:
 * - `useNavigationStackRecorder`, montado uma vez no layout das telas logadas, grava a pilha a
 *   cada troca de tela;
 * - `useBackTarget`, nas telas de detalhe, diz o destino do "voltar" e leva até lá.
 */

const STORAGE_KEY = 'navigation-stacks';
/** Quantas entradas do histórico guardam pilha: as mais antigas saem primeiro. */
const MAX_STORED = 100;

/** As telas do menu dos três módulos: chegar a uma delas começa um caminho novo. */
const ROOTS = Object.values(NAV_ITEMS_BY_CONTEXT).flatMap((items) => items.map((item) => item.to));

type Stored = { key: number; stack: NavigationEntry[] }[];

/**
 * O lugar de onde se navega, no formato que o SvelteKit entrega em `afterNavigate`. Na abertura
 * da aba o SvelteKit manda um `from` SEM endereço (`url: null`), não `null`: ler `from.url`
 * direto quebrava o `afterNavigate`, o roteador não terminava de ligar e todo clique no menu
 * virava recarregamento da página inteira — a tela "piscando".
 */
export type NavigationPlace = { url: URL | null } | null;

const stackState = $state<{ current: NavigationEntry[] }>({ current: [] });

function readStored(): Stored {
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item): item is { key: number; stack: unknown } => typeof item?.key === 'number')
      .map((item) => ({ key: item.key, stack: parseStack(item.stack) }));
  } catch {
    return [];
  }
}

function writeStored(key: number, stack: NavigationEntry[]): void {
  try {
    const kept = readStored().filter((item) => item.key !== key);
    const next = [...kept, { key, stack }].slice(-MAX_STORED);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* Sem armazenamento (aba anônima, bloqueado): a pilha vale enquanto a aba está aberta. */
  }
}

function stackOfKey(key: number | null): NavigationEntry[] | null {
  if (key === null) return null;

  return readStored().find((item) => item.key === key)?.stack ?? null;
}

/** A posição da entrada atual no histórico, que o SvelteKit guarda em `history.state`. */
export function historyIndex(): number | null {
  const index = (window.history.state as Record<string, unknown> | null)?.['sveltekit:history'];

  return typeof index === 'number' ? index : null;
}

function entryOf(url: URL, index: number | null): NavigationEntry {
  return {
    href: `${url.pathname}${url.search}${url.hash}`,
    pathname: url.pathname,
    label: pathLabelOf(url.pathname),
    index,
  };
}

/**
 * Grava a pilha da tela que abriu. A mesma entrada do histórico vista de novo (F5, voltar,
 * avançar) reusa a pilha dela; a tela anterior é a entrada logo antes no navegador.
 */
export function recordNavigation(to: URL, from: NavigationPlace, index: number | null): void {
  const known = stackOfKey(index);
  if (known) {
    stackState.current = known;
    return;
  }

  const fromUrl = from?.url ?? null;
  const fromIndex = index === null ? null : index - 1;
  const fromStack = fromUrl ? (stackOfKey(fromIndex) ?? stackState.current) : [];
  const stack = nextStack(
    fromStack,
    fromUrl ? entryOf(fromUrl, fromIndex) : null,
    to.pathname,
    ROOTS,
  );
  if (index !== null) writeStored(index, stack);
  stackState.current = stack;
}

/** Monte UMA vez, no layout das telas logadas: é quem grava a pilha a cada troca de tela. */
export function useNavigationStackRecorder(): void {
  afterNavigate((navigation) => {
    if (!navigation.to) return;
    recordNavigation(navigation.to.url, navigation.from, historyIndex());
  });
}

export type BackTarget = {
  /** O que vem depois de "Voltar para": "o chamado", "a máquina", "os chamados". */
  readonly destination: string;
  onBack: () => void;
};

/**
 * Para onde o "voltar" desta tela leva: a tela anterior do caminho, ou — sem caminho (aba nova,
 * link colado) — o lugar natural dela, que a própria tela informa.
 */
export function useBackTarget(fallback: { to: string; destination: string }): BackTarget {
  return {
    get destination() {
      return backEntryOf(stackState.current)?.label ?? fallback.destination;
    },
    onBack: () => {
      const entry = backEntryOf(stackState.current);
      if (!entry) return void goto(fallback.to);
      /* A tela anterior é a entrada logo antes no navegador: volta por ele, que devolve
         também a rolagem. Senão (F5 em outro ponto, histórico trocado), navega até ela. */
      const current = historyIndex();
      if (entry.index !== null && current !== null && current === entry.index + 1) {
        return window.history.back();
      }
      void goto(entry.href);
    },
  };
}

/** Só para os testes: a pilha da tela aberta agora, e um começo limpo. */
export function currentStack(): NavigationEntry[] {
  return stackState.current;
}

export function resetNavigationStack(): void {
  stackState.current = [];
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* Nada a limpar sem armazenamento. */
  }
}
