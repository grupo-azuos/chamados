import CircleHelp from '@lucide/svelte/icons/circle-help';
import Package from '@lucide/svelte/icons/package';
import Printer from '@lucide/svelte/icons/printer';
import { describe, expect, it } from 'vitest';

import { inventoryCategoryIconOf, partCategoryIconOf, ticketProblemIconOf } from './record-icon.util';

describe('record icons', () => {
  // feliz
  it('draws the subject of each record', () => {
    expect(ticketProblemIconOf('printer')).toBe(Printer);
    expect(inventoryCategoryIconOf('furniture')).not.toBe(Package);
    expect(partCategoryIconOf('ssd')).not.toBe(Package);
  });

  // triste
  it('falls back to a neutral drawing for a type created on the spot', () => {
    expect(ticketProblemIconOf('Planilha do RH')).toBe(CircleHelp);
    expect(inventoryCategoryIconOf('desconhecida')).toBe(Package);
    expect(partCategoryIconOf('desconhecida')).toBe(Package);
  });
});
