import { describe, expect, it } from 'vitest';

import { actorDisplayName, UNKNOWN_ACTOR_LABEL } from './actor-name.util';

const acesso = (key: string) => ({ 'leyla@azuoscontabil.com.br': 'Leyla Ribeiro' })[key] ?? null;

const legado = (key: string) =>
  ({ 'leylabraz1994@outlook.com': 'Leyla', camila: 'Camila' })[key] ?? null;

describe('actorDisplayName', () => {
  it('does not expose an unknown UUID as a person name', () => {
    expect(actorDisplayName('11111111-1111-1111-1111-111111111111')).toBe(UNKNOWN_ACTOR_LABEL);
  });
  it('names the person from the access list', () => {
    expect(actorDisplayName('leyla@azuoscontabil.com.br', acesso, legado)).toBe('Leyla Ribeiro');
  });

  it('falls back to the de-para of the previous system', () => {
    expect(actorDisplayName('leylabraz1994@outlook.com', acesso, legado)).toBe('Leyla');
  });

  /** O cadastro de acesso é a pessoa de hoje, com o nome que ela mesma mantém. */
  it('prefers the access list over the de-para', () => {
    const outro = () => 'Nome Antigo';

    expect(actorDisplayName('leyla@azuoscontabil.com.br', acesso, outro)).toBe('Leyla Ribeiro');
  });

  it('matches ignoring case, because the author was typed by hand', () => {
    expect(actorDisplayName('  CAMILA ', acesso, legado)).toBe('Camila');
  });

  /**
   * A REGRA QUE DÁ SENTIDO AO ARQUIVO.
   *
   * Um endereço que nenhuma lista conhece não vai para a tela. O que já esteve aqui derivava
   * o nome do prefixo e inventava gente: `advgabryelisaac@gmail.com` virava
   * "Advgabryelisaac", num relatório que paga.
   */
  // triste
  it('never shows an e-mail address that no list knows', () => {
    expect(actorDisplayName('advgabryelisaac@gmail.com', acesso, legado)).toBe(UNKNOWN_ACTOR_LABEL);
  });

  // triste
  it('never derives a name from the local part', () => {
    expect(actorDisplayName('advgabryelisaac@gmail.com', acesso, legado)).not.toMatch(/adv/i);
  });

  /** Texto que não é endereço é o que está gravado, e não expõe ninguém. */
  it('keeps a non-address author as it was written', () => {
    expect(actorDisplayName('consolidacao-duplicados', acesso, legado)).toBe(
      'consolidacao-duplicados',
    );
  });

  // triste
  it('answers with the label when there is no author at all', () => {
    expect(actorDisplayName(null, acesso, legado)).toBe(UNKNOWN_ACTOR_LABEL);
    expect(actorDisplayName('   ', acesso, legado)).toBe(UNKNOWN_ACTOR_LABEL);
  });

  // triste
  it('ignores a lookup that answers with blank', () => {
    expect(actorDisplayName('camila', () => '   ', legado)).toBe('Camila');
  });
});
