import { describe, expect, it } from 'vitest';

import {
  computerAlertSchema,
  computerCreateFormSchema,
  computerResponsibleSchema,
  computerListQuerySchema,
  computerReportQuerySchema,
  createComputerSchema,
  updateComputerSchema,
} from './computer.schema';

describe('createComputerSchema', () => {
  // feliz
  it('accepts a machine registered with nothing but its name and kind', () => {
    const parsed = createComputerSchema.parse({ name: 'RECEPCAO-01', kind: 'desktop' });

    expect(parsed.name).toBe('RECEPCAO-01');
    expect(parsed.kind).toBe('desktop');
  });

  it('accepts the identification filled in right away', () => {
    const parsed = createComputerSchema.parse({
      name: 'RECEPCAO-01',
      kind: 'notebook',
      displayName: 'Computador da recepção',
      responsibleName: 'Helena Dias',
      department: 'recepcao',
    });

    expect(parsed.department).toBe('recepcao');
  });

  it('trims the name before storing it', () => {
    expect(createComputerSchema.parse({ name: '  RECEPCAO-01  ', kind: 'desktop' }).name).toBe('RECEPCAO-01');
  });

  // triste
  it('refuses a machine with no name, since the agent matches by it', () => {
    const result = createComputerSchema.safeParse({ name: '   ', kind: 'desktop' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Informe o nome da máquina');
  });

  it('refuses a department that is not on the list, in Portuguese', () => {
    const result = createComputerSchema.safeParse({ name: 'PC-1', kind: 'desktop', department: 'MARKETING' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Escolha um departamento da lista');
  });

  /* Hardware é medido, não digitado: aceitá-lo aqui faria a ficha discordar da máquina. */
  it('ignores hardware sent at registration, because only the agent measures it', () => {
    const parsed = createComputerSchema.parse({ name: 'PC-1', kind: 'desktop', totalMemoryBytes: 999 });

    expect(parsed).not.toHaveProperty('totalMemoryBytes');
  });

  /* O token é gerado pelo servidor; aceitar um escolhido de fora anularia a proteção. */
  it('ignores a token sent at registration', () => {
    const parsed = createComputerSchema.parse({ name: 'PC-1', kind: 'desktop', token: 'eu-escolhi' });

    expect(parsed).not.toHaveProperty('token');
  });

  /* Desktop ou notebook é escolha de quem cadastra: o servidor não presume nenhum dos dois. */
  it('refuses a machine registered without saying whether it is a desktop or a notebook', () => {
    const result = createComputerSchema.safeParse({ name: 'PC-1' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Escolha se é desktop ou notebook');
  });

  it('refuses a kind that is not desktop or notebook', () => {
    expect(createComputerSchema.safeParse({ name: 'PC-1', kind: 'tablet' }).success).toBe(false);
  });
});

describe('updateComputerSchema', () => {
  // feliz
  it('accepts changing only the responsible person', () => {
    expect(updateComputerSchema.parse({ responsibleName: 'Ana' })).toEqual({
      responsibleName: 'Ana',
    });
  });

  it('turns an emptied nickname into null, so the field is actually cleared', () => {
    expect(updateComputerSchema.parse({ displayName: '   ' }).displayName).toBeNull();
  });

  it('accepts archiving and blocking with a reason', () => {
    const parsed = updateComputerSchema.parse({
      isArchived: true,
      isBlocked: true,
      blockReason: 'Máquina de terceiro, não autorizada',
    });

    expect(parsed.isBlocked).toBe(true);
  });

  it('accepts an empty change without touching anything', () => {
    expect(updateComputerSchema.parse({})).toEqual({});
  });

  // triste
  /* O nome vem da própria máquina: renomeá-lo aqui quebraria o encontro na próxima conexão. */
  it('refuses renaming the machine, which is how the agent is matched', () => {
    const parsed = updateComputerSchema.parse({ name: 'OUTRO-NOME' });

    expect(parsed).not.toHaveProperty('name');
  });

  it('refuses editing measured hardware', () => {
    const parsed = updateComputerSchema.parse({ totalMemoryBytes: 999, healthScore: 100 });

    expect(parsed).not.toHaveProperty('totalMemoryBytes');
    expect(parsed).not.toHaveProperty('healthScore');
  });
});

describe('computerListQuerySchema', () => {
  it('parses online-only filters without treating the string false as true', () => {
    expect(computerListQuerySchema.parse({ onlyOnline: 'true' }).onlyOnline).toBe(true);
    expect(computerListQuerySchema.parse({ onlyOnline: 'false' }).onlyOnline).toBe(false);
    expect(computerListQuerySchema.parse({ onlyOnline: false }).onlyOnline).toBe(false);
    expect(computerListQuerySchema.parse({}).onlyOnline).toBeUndefined();
  });
  it('parses offline, kind and alert filters', () => {
    const parsed = computerListQuerySchema.parse({ onlyOffline: 'true', kind: 'notebook', alert: 'memory' });

    expect(parsed.onlyOffline).toBe(true);
    expect(parsed.kind).toBe('notebook');
    expect(parsed.alert).toBe('memory');
  });

  it('refuses an alert filter that is not one of the watched measures', () => {
    expect(computerListQuerySchema.safeParse({ alert: 'network' }).success).toBe(false);
  });

  // feliz
  it('fills in the default page when the screen sends no filter', () => {
    const parsed = computerListQuerySchema.parse({});

    expect(parsed.page).toBe(1);
    expect(parsed.department).toBeUndefined();
  });

  it('accepts the panel filters together', () => {
    const parsed = computerListQuerySchema.parse({
      search: '  recepcao  ',
      department: 'rh',
      healthStatus: 'critical',
    });

    expect(parsed.search).toBe('recepcao');
    expect(parsed.healthStatus).toBe('critical');
  });

  // triste
  /* Arquivada saiu de uso: trazê-la por padrão poluiria a lista de quem trabalha nela. */
  it('leaves archived machines out unless they are asked for', () => {
    expect(computerListQuerySchema.parse({}).includeArchived).toBeUndefined();
  });

  it('refuses a page size above the ceiling', () => {
    expect(computerListQuerySchema.safeParse({ pageSize: 5000 }).success).toBe(false);
  });
});

describe('computerReportQuerySchema', () => {
  // feliz
  it('accepts the same filters as the list, plus the file format', () => {
    const parsed = computerReportQuerySchema.parse({ department: 'rh', format: 'pdf' });

    expect(parsed.department).toBe('rh');
    expect(parsed.format).toBe('pdf');
  });

  // triste
  it('refuses a report with no format chosen', () => {
    expect(computerReportQuerySchema.safeParse({ department: 'rh' }).success).toBe(false);
  });
});

describe('computerAlertSchema', () => {
  const RECOVERED = {
    id: 1,
    computerId: 7,
    metric: 'disk',
    peakValue: 97.4,
    threshold: 90,
    status: 'recovered',
    startedAt: '2026-09-20T12:00:00.000Z',
    recoveredAt: '2026-09-20T12:35:00.000Z',
    causeProcess: 'OneDrive.exe',
  };

  // feliz
  it('accepts an episode that already ended', () => {
    const parsed = computerAlertSchema.parse(RECOVERED);

    expect(parsed.recoveredAt).not.toBeNull();
  });

  /* Episódio em aberto é o que a ficha mostra em vermelho: sem data de recuperação. */
  it('accepts an episode still happening, with no recovery time', () => {
    const parsed = computerAlertSchema.parse({
      ...RECOVERED,
      status: 'active',
      recoveredAt: null,
      causeProcess: null,
    });

    expect(parsed.recoveredAt).toBeNull();
    expect(parsed.causeProcess).toBeNull();
  });

  // triste
  it('refuses a measure that is not one of the three watched', () => {
    expect(computerAlertSchema.safeParse({ ...RECOVERED, metric: 'gpu' }).success).toBe(false);
  });

  it('refuses a start time that is not a date', () => {
    expect(computerAlertSchema.safeParse({ ...RECOVERED, startedAt: 'ontem' }).success).toBe(false);
  });
});


describe('computerResponsibleSchema', () => {
  // feliz
  it('exposes only the identifier and name for the responsible picker', () => {
    expect(computerResponsibleSchema.parse({ id: 'person-1', name: 'Ana Exemplo', email: 'ana@example.invalid' }))
      .toEqual({ id: 'person-1', name: 'Ana Exemplo' });
  });

  // triste
  it('rejects a directory entry without a name', () => {
    expect(computerResponsibleSchema.safeParse({ id: 'person-1' }).success).toBe(false);
  });
});

describe('computerCreateFormSchema', () => {
  const filled = { name: 'PC-1', displayName: '', responsibleName: '', department: '' as const };

  // feliz
  it('accepts the form once desktop or notebook was chosen', () => {
    expect(computerCreateFormSchema.safeParse({ ...filled, kind: 'notebook' }).success).toBe(true);
  });

  // triste
  it('asks to choose desktop or notebook while the choice is still empty', () => {
    const result = computerCreateFormSchema.safeParse({ ...filled, kind: '' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Escolha se é desktop ou notebook');
  });
});
