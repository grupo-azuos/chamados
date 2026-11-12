import { describe, expect, it } from 'vitest';

import {
  isTicketArea,
  isTicketProblemType,
  builtInProblemTypeByLabel,
  isTicketProblemTypeForArea,
  problemTypeFitsArea,
  withRegisteredProblemType,
  TICKET_PROBLEM_TYPES,
  ticketAreaLabel,
  ticketProblemTypeLabel,
  ticketProblemTypeOptions,
  ticketAreaOptions,
  ticketProblemTypeOptionsForArea,
  ticketProblemTypesForArea,
} from './ticket-catalog.util';

describe('ticketAreaOptions', () => {
  // feliz
  it('lists the three areas with a Portuguese label', () => {
    expect(ticketAreaOptions()).toEqual([
      { value: 'infra', label: 'Infraestrutura' },
      { value: 'sistema', label: 'Sistema' },
      { value: 'manutencao', label: 'Manutenção' },
    ]);
  });
});

describe('ticketProblemTypesForArea', () => {
  // feliz
  it('keeps infra on the same catalog it always had', () => {
    expect(ticketProblemTypesForArea('infra')).toContain('printer');
    expect(ticketProblemTypesForArea('infra')).toContain('network');
  });

  it('gives sistema its own, shorter catalog', () => {
    expect(ticketProblemTypesForArea('sistema')).toContain('bug');
    expect(ticketProblemTypesForArea('sistema')).not.toContain('printer');
  });

  it('gives manutencao its own catalog, about the building', () => {
    expect(ticketProblemTypesForArea('manutencao')).toContain('air_conditioning');
    expect(ticketProblemTypesForArea('manutencao')).not.toContain('bug');
  });
});

describe('TICKET_PROBLEM_TYPES', () => {
  // feliz
  it('is the union of every area, with no duplicates', () => {
    expect(TICKET_PROBLEM_TYPES).toContain('printer');
    expect(TICKET_PROBLEM_TYPES).toContain('bug');
    expect(TICKET_PROBLEM_TYPES).toContain('air_conditioning');
    /* "other" existe nas três áreas — a união não pode repeti-lo. */
    expect(TICKET_PROBLEM_TYPES.filter((type) => type === 'other')).toHaveLength(1);
  });
});

describe('isTicketProblemTypeForArea', () => {
  // feliz
  it('accepts a type that belongs to the area', () => {
    expect(isTicketProblemTypeForArea('manutencao', 'air_conditioning')).toBe(true);
  });

  // triste
  it('refuses a type that exists, but on another area', () => {
    expect(isTicketProblemTypeForArea('manutencao', 'printer')).toBe(false);
  });

  it('refuses a value that does not exist anywhere', () => {
    expect(isTicketProblemTypeForArea('infra', 'ovni')).toBe(false);
  });
});

describe('ticketProblemTypeOptionsForArea', () => {
  // feliz
  it('pairs each type of the area with its Portuguese label', () => {
    const options = ticketProblemTypeOptionsForArea('manutencao');

    expect(options).toContainEqual({ value: 'air_conditioning', label: 'Ar-condicionado' });
  });
});

describe('ticket catalog labels and guards', () => {
  // feliz
  it('labels every area and every problem type', () => {
    expect(ticketAreaLabel('infra')).toBe('Infraestrutura');
    expect(ticketProblemTypeOptions().map((option) => option.value)).toEqual([...TICKET_PROBLEM_TYPES]);
    for (const option of ticketProblemTypeOptions()) {
      expect(ticketProblemTypeLabel(option.value)).toBe(option.label);
    }
  });

  // triste
  it('refuses what is not an area or a problem type', () => {
    expect(isTicketArea('sistema')).toBe(true);
    expect(isTicketArea('financeiro')).toBe(false);
    expect(isTicketArea(3)).toBe(false);
    expect(isTicketProblemType('printer')).toBe(true);
    expect(isTicketProblemType('tsunami')).toBe(false);
    expect(isTicketProblemType(null)).toBe(false);
  });
});

describe('registered problem types', () => {
  // feliz
  it('labels a registered type by its own name', () => {
    expect(ticketProblemTypeLabel('printer')).toBe('Impressora');
    expect(ticketProblemTypeLabel('Nobreak')).toBe('Nobreak');
  });

  it('lets a registered name through, leaving the check to the server', () => {
    expect(problemTypeFitsArea('infra', 'Nobreak')).toBe(true);
  });

  it('finds the fixed type behind a typed label', () => {
    expect(builtInProblemTypeByLabel('infra', ' impressora ')).toBe('printer');
  });

  // triste
  it('refuses a fixed type of another area', () => {
    expect(problemTypeFitsArea('infra', 'air_conditioning')).toBe(false);
  });

  it('finds nothing for a label that is not fixed', () => {
    expect(builtInProblemTypeByLabel('infra', 'Nobreak')).toBeNull();
  });
});

describe('withRegisteredProblemType', () => {
  const options = [
    { value: 'printer', label: 'Impressora' },
    { value: 'other', label: 'Outro' },
  ];

  // feliz
  it('puts the new type before "Outro"', () => {
    expect(
      withRegisteredProblemType(options, { value: 'Monitor', label: 'Monitor' }).map((o) => o.value),
    ).toEqual(['printer', 'Monitor', 'other']);
  });

  // triste
  it('does not repeat a type already on the list', () => {
    expect(withRegisteredProblemType(options, { value: 'printer', label: 'Impressora' })).toEqual(
      options,
    );
  });
});
