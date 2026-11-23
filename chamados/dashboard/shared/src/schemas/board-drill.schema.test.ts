import { describe, expect, it } from 'vitest';

import {
  boardDrillParamSchema,
  drillFromParam,
  drillParam,
  drillSummary,
} from './board-drill.schema';

const BASE = {
  source: 'systemTickets',
  groupBy: 'status',
  filterId: null,
} as const;

describe('boardDrillParamSchema', () => {
  // feliz
  it('reads the drill from its JSON text, with the defaults filled in', () => {
    const parsed = boardDrillParamSchema.parse(
      JSON.stringify({ ...BASE, key: 'aberto', label: 'Aberto' }),
    );

    expect(parsed.key).toBe('aberto');
    expect(parsed.key2).toBeNull();
    expect(parsed.period).toBe('all');
    expect(parsed.matches).toEqual([]);
  });

  // triste
  it('rejects text that is not JSON with a readable message', () => {
    const parsed = boardDrillParamSchema.safeParse('{oops');

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toBe('O recorte do painel não é um JSON válido');
  });

  // triste
  it('rejects a source that does not exist', () => {
    expect(
      boardDrillParamSchema.safeParse(JSON.stringify({ ...BASE, source: 'nope' })).success,
    ).toBe(false);
  });
});

describe('drillFromParam', () => {
  // feliz
  it('round-trips a drill through the URL parameter', () => {
    const drill = boardDrillParamSchema.parse(JSON.stringify({ ...BASE, key: 'aberto' }));

    expect(drillFromParam(drillParam(drill))).toEqual(drill);
  });

  // triste
  it('returns null for a missing or broken parameter', () => {
    expect(drillFromParam(null)).toBeNull();
    expect(drillFromParam('')).toBeNull();
    expect(drillFromParam('{oops')).toBeNull();
  });
});

describe('drillSummary', () => {
  // feliz
  it('describes the block, the clicked item, the period and the board filters', () => {
    const drill = boardDrillParamSchema.parse(
      JSON.stringify({
        ...BASE,
        title: 'Chamados por situação',
        key: 'aberto',
        label: 'Aberto',
        period: '30d',
        onlyMine: true,
        person: '@me',
        matches: [{ field: 'priority', value: 'alta' }],
        filterId: '7f8e3c2a-1b4d-4e6f-9a0b-1c2d3e4f5a6b',
      }),
    );

    expect(drillSummary(drill)).toEqual([
      'Chamados por situação',
      'Situação: Aberto',
      'Últimos 30 dias',
      'Só os meus',
      'Responsável: Eu',
      expect.stringMatching(/^Prioridade: /),
      'Com o filtro salvo do bloco',
    ]);
  });

  // triste
  it('falls back to the source name and skips what the drill does not have', () => {
    const drill = boardDrillParamSchema.parse(JSON.stringify({ ...BASE, groupBy: null }));

    expect(drillSummary(drill)).toEqual(['Chamados']);
  });
});
