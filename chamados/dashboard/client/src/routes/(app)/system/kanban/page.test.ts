import { isRedirect } from '@sveltejs/kit';
import { describe, expect, it } from 'vitest';

import { load } from './+page';

function caught(): unknown {
  try {
    load();
  } catch (thrown: unknown) {
    return thrown;
  }

  return null;
}

describe('the old system/kanban address', () => {
  // feliz
  it('sends the person to the System tickets, already on the board', () => {
    const thrown = caught();

    expect(isRedirect(thrown)).toBe(true);
    expect(thrown).toMatchObject({ status: 308, location: '/system/tickets?view=kanban' });
  });

  // triste
  /* O quadro não tem mais tela própria: nada deste endereço monta, só redireciona. */
  it('never answers with a screen of its own', () => {
    expect(() => load()).toThrow();
  });
});
