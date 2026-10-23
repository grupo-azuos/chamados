import { page } from '$app/state';
import { writable, type Readable } from 'svelte/store';

import {
  clearScreenFilters,
  loadScreenFilters,
  saveScreenFilters,
} from '$lib/utils/filter-storage.util';

export type PersistedFiltersOptions<TFilters> = {
  /** O nome da tela na chave. Estável: renomear faz todo mundo perder o filtro salvo. */
  screen: string;
  /** Os filtros quando não há preferência válida — e para onde "limpar" volta. */
  defaults: TFilters;
  /**
   * Reconhece o que veio do armazenamento (tipo desconhecido) e devolve filtros bem formados,
   * ou `null` quando não serve. É a única porta de entrada do dado salvo na tela.
   */
  parse: (raw: unknown) => TFilters | null;
  /**
   * Os filtros pedidos pelo ENDEREÇO (`?healthStatus=critical`) — é por onde os cartões do
   * painel chegam. Devolve só os campos que a URL trouxe, ou `null` quando ela não traz filtro.
   */
  fromUrl?: (params: URLSearchParams) => Partial<TFilters> | null;
};

export type PersistedFilterStore<TFilters> = Readable<TFilters> & {
  /** Grava na hora: o filtro sobrevive ao F5, ao ir e voltar e a fechar o navegador. */
  update: (change: (previous: TFilters) => TFilters) => void;
  /** "Limpar filtros": apaga a preferência salva e volta ao padrão da tela. */
  clear: () => void;
};

/**
 * OS FILTROS DE UMA TELA, que sobrevivem ao F5, ao ir e voltar e a fechar o navegador — o
 * mesmo formato do Paralegal (`filter-storage.util`): um objeto por pessoa, uma entrada por tela.
 *
 * Uma STORE, e não `$state`: os hooks de lista entregam o filtro ao `createQuery` como store,
 * e é ela quem decide quando refazer a busca.
 *
 * O estado inicial é lido de forma SÍNCRONA, antes da primeira consulta, para ela já sair com o
 * recorte certo. Prioridade:
 *
 *  1. **Endereço** — quem clicou num cartão do painel quer ver EXATAMENTE aquilo. A URL parte do
 *     padrão, não do salvo: um departamento esquecido do último uso faria a lista discordar do
 *     número do cartão. O recorte da URL passa a ser o salvo.
 *  2. **Salvo** — validado campo a campo pelo `parse`.
 *  3. **Padrão.**
 *
 * Quem grava é o `update`, e não uma inscrição na store: uma inscrição gravaria o padrão já na
 * abertura e, depois do "limpar", gravaria de novo — a preferência nunca estaria ausente.
 */
export function persistedFilterStore<TFilters>(
  options: PersistedFiltersOptions<TFilters>,
): PersistedFilterStore<TFilters> {
  const userId = page.data.user?.id;
  const { screen, defaults } = options;
  const store = writable<TFilters>(restore(userId, options, page.url.searchParams));

  return {
    subscribe: store.subscribe,
    update: (change) =>
      store.update((previous) => {
        const next = change(previous);
        saveScreenFilters(userId, screen, next);

        return next;
      }),
    clear: () => {
      clearScreenFilters(userId, screen);
      store.set({ ...defaults });
    },
  };
}

/** Exportada para ter teste próprio: é ela que decide com que recorte a tela abre. */
export function restore<TFilters>(
  userId: string | undefined,
  options: PersistedFiltersOptions<TFilters>,
  params: URLSearchParams,
): TFilters {
  const fromUrl = options.fromUrl?.(params);
  if (fromUrl) {
    const requested = { ...options.defaults, ...fromUrl };
    saveScreenFilters(userId, options.screen, requested);

    return requested;
  }

  return options.parse(loadScreenFilters(userId, options.screen)) ?? { ...options.defaults };
}
