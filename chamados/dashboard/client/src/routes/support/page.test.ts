import { describe, expect, it } from 'vitest';

import { load } from './+page';

describe('a tela de abrir chamado (/support)', () => {
  // feliz
  it('leva o link de consulta antigo para a tela de consultar, com o mesmo token', () => {
    const run = () => load({ url: new URL('http://localhost/support?ticket=abc.123') });

    expect(run).toThrow(expect.objectContaining({ status: 307, location: '/support/tickets?ticket=abc.123' }));
  });

  // triste
  it('fica no formulário quando não há link de consulta', () => {
    expect(load({ url: new URL('http://localhost/support?invite=xyz') })).toBeUndefined();
  });
});
