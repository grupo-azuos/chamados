import { drillParam, boardDrillSchema } from '@template/shared/schemas/board-drill.schema';
import { describe, expect, it } from 'vitest';

import { DRILL_UNREADABLE, drillBannerOf } from './use-board-drill.svelte';

const DRILL = boardDrillSchema.parse({
  source: 'systemTickets',
  groupBy: 'status',
  filterId: null,
  key: 'aberto',
  label: 'Aberto',
  title: 'Chamados por situação',
});

describe('drillBannerOf', () => {
  // feliz
  it('describes the cut the list came with', () => {
    expect(drillBannerOf(drillParam(DRILL), DRILL)).toEqual({
      summary: ['Chamados por situação', 'Situação: Aberto'],
      notice: null,
    });
  });

  // triste
  it('warns when the cut in the address could not be read', () => {
    expect(drillBannerOf('{oops', null)).toEqual({ summary: [], notice: DRILL_UNREADABLE });
  });

  // triste
  it('shows nothing without a cut', () => {
    expect(drillBannerOf(null, null)).toBeNull();
  });
});
