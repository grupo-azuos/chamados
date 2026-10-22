import { describe, expect, it } from 'vitest';

import { fieldParser, isFlag, isText, oneOf, urlParser, type FieldGuards } from './filter-fields.util';

type Filter = { search: string; kind: '' | 'desktop' | 'notebook'; archived: boolean };

const DEFAULTS: Filter = { search: '', kind: '', archived: false };
const GUARDS: FieldGuards<Filter> = {
  search: isText,
  kind: oneOf('', 'desktop', 'notebook'),
  archived: isFlag,
};

describe('fieldParser', () => {
  // feliz
  it('reads every valid field from the saved object', () => {
    expect(fieldParser(DEFAULTS, GUARDS)({ search: 'rh', kind: 'notebook', archived: true })).toEqual({
      search: 'rh',
      kind: 'notebook',
      archived: true,
    });
  });

  // triste
  /* Um campo ruim (um tipo que deixou de existir) volta ao padrão sem levar os outros junto. */
  it('drops only the field that no longer fits', () => {
    expect(fieldParser(DEFAULTS, GUARDS)({ search: 'rh', kind: 'tablet', archived: 'sim' })).toEqual({
      search: 'rh',
      kind: '',
      archived: false,
    });
    expect(fieldParser(DEFAULTS, GUARDS)(['não', 'é', 'objeto'])).toBeNull();
  });
});

describe('urlParser', () => {
  // feliz
  it('reads the fields the address brings, yes/no as text', () => {
    const params = new URLSearchParams('kind=desktop&archived=true&page=2');

    expect(urlParser(DEFAULTS, GUARDS)(params)).toEqual({ kind: 'desktop', archived: true });
  });

  // triste
  it('answers null when the address brings no valid filter', () => {
    expect(urlParser(DEFAULTS, GUARDS)(new URLSearchParams('kind=tablet'))).toBeNull();
    expect(urlParser(DEFAULTS, GUARDS)(new URLSearchParams(''))).toBeNull();
  });
});
