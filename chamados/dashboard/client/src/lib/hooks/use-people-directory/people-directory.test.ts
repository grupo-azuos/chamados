import { afterEach, describe, expect, it } from 'vitest';

import { normalizePersonName, personPhotoOf, setPeopleDirectory } from './people-directory.svelte';

afterEach(() => setPeopleDirectory([]));

describe('people directory', () => {
  // feliz
  it('finds the photo by id, and by the name when the record kept only the name', () => {
    setPeopleDirectory([{ id: 'wq', name: 'Wellington Queiroz', avatarUrl: 'https://cdn/wq.png' }]);

    expect(personPhotoOf({ id: 'wq' })).toBe('https://cdn/wq.png');
    expect(personPhotoOf({ name: '  wellington   QUEIROZ ' })).toBe('https://cdn/wq.png');
  });

  // feliz
  /* O registro que guardou o login (e-mail) no lugar do id também acha a foto. */
  it('finds the photo by the e-mail, also when the name is the e-mail', () => {
    setPeopleDirectory([
      { id: 'gs', name: 'Guilherme Siqueira', email: 'GS@azuos.com.br', avatarUrl: 'https://cdn/gs.png' },
    ]);

    expect(personPhotoOf({ email: ' gs@azuos.com.br ' })).toBe('https://cdn/gs.png');
    expect(personPhotoOf({ name: 'gs@azuos.com.br' })).toBe('https://cdn/gs.png');
  });

  // triste
  it('gives no photo for someone unknown or without a photo', () => {
    setPeopleDirectory([{ id: 'ana', name: 'Ana', avatarUrl: null }]);

    expect(personPhotoOf({ id: 'ana', name: 'Ana' })).toBeNull();
    expect(personPhotoOf({ id: 'x', name: 'Ninguém' })).toBeNull();
    expect(normalizePersonName('Ângela  Souza')).toBe('angela souza');
  });
});
