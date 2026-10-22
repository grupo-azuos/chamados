import { afterEach, describe, expect, it } from 'vitest';

import { fieldParser, isFlag, isText, urlParser, type FieldGuards } from '$lib/utils/filter-fields.util';
import { loadScreenFilters, saveScreenFilters } from '$lib/utils/filter-storage.util';

import { restore } from './use-persisted-filters.svelte';

type Filter = { search: string; outOfStockOnly: boolean };

const USER = '00000000-0000-4000-8000-000000000001';
const DEFAULTS: Filter = { search: '', outOfStockOnly: false };
const GUARDS: FieldGuards<Filter> = { search: isText, outOfStockOnly: isFlag };
const OPTIONS = {
  screen: 'infra-parts',
  defaults: DEFAULTS,
  parse: fieldParser(DEFAULTS, GUARDS),
  fromUrl: urlParser(DEFAULTS, GUARDS),
};

afterEach(() => window.localStorage.clear());

describe('restore', () => {
  // feliz
  it('opens with what the person left saved', () => {
    saveScreenFilters(USER, 'infra-parts', { search: 'teclado', outOfStockOnly: false });

    expect(restore(USER, OPTIONS, new URLSearchParams())).toEqual({
      search: 'teclado',
      outOfStockOnly: false,
    });
  });

  /* Vindo de um cartão do painel, a lista mostra EXATAMENTE o que o cartão conta: a URL parte
     do padrão, e não do salvo — e passa a ser o salvo. */
  it('lets the address win over the saved filter, starting from the defaults', () => {
    saveScreenFilters(USER, 'infra-parts', { search: 'teclado', outOfStockOnly: false });

    const restored = restore(USER, OPTIONS, new URLSearchParams('outOfStockOnly=true'));

    expect(restored).toEqual({ search: '', outOfStockOnly: true });
    expect(loadScreenFilters(USER, 'infra-parts')).toEqual(restored);
  });

  // triste
  it('falls back to the defaults when nothing usable is saved', () => {
    expect(restore(USER, OPTIONS, new URLSearchParams())).toEqual(DEFAULTS);
    expect(restore(undefined, OPTIONS, new URLSearchParams())).toEqual(DEFAULTS);
  });
});
