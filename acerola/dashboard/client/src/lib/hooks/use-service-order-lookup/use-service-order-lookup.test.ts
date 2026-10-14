import { describe, expect, it } from 'vitest';

import { INVALID_CODE_MESSAGE, lookupTargetOf } from './use-service-order-lookup.svelte';

describe('lookupTargetOf', () => {
  // feliz
  /* O código do papel vem em maiúsculas e com espaço em volta: vale do mesmo jeito. */
  it('takes the short code of the paper to the conference of that document', () => {
    expect(lookupTargetOf('  A1B2C3D4E5F6 ')).toEqual({ path: '/verify/a1b2c3d4e5f6' });
  });

  it('takes the full code too', () => {
    const full = 'ab'.repeat(32);

    expect(lookupTargetOf(full)).toEqual({ path: `/verify/${full}` });
  });

  // triste
  /* Prefixo curto serviria para ir adivinhando emissões: não é aceito. */
  it('refuses something that cannot be a code', () => {
    expect(lookupTargetOf('a1b2')).toEqual({ error: INVALID_CODE_MESSAGE });
    expect(lookupTargetOf('não é código!')).toEqual({ error: INVALID_CODE_MESSAGE });
    expect(lookupTargetOf('')).toEqual({ error: INVALID_CODE_MESSAGE });
  });
});
