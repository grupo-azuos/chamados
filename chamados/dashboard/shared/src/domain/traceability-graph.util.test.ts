import { describe, expect, it } from 'vitest';

import { type TraceabilityFacts, traceabilityGraph } from './traceability-graph.util';

function facts(over: Partial<TraceabilityFacts> = {}): TraceabilityFacts {
  return {
    computers: [{ id: 3, label: 'Computador 02', sublabel: 'PARALEGAL-D02', departmentId: 7 }],
    responsibles: [
      { computerId: 3, personId: 'ana', isCurrent: true },
      { computerId: 3, personId: 'bia', isCurrent: false },
    ],
    tickets: [
      { id: 56, computerId: 3, protocol: 'CH-0056', title: 'Não liga', isOpen: true },
      { id: 40, computerId: 3, protocol: 'CH-0040', title: 'Lento', isOpen: false },
    ],
    parts: [{ partId: 9, computerId: 3, name: 'SSD 480 GB', quantity: 1 }],
    tasks: [{ id: 12, computerId: 3, title: 'Preventiva', isOpen: true }],
    departmentName: (id) => (id === 7 ? 'Paralegal' : null),
    person: (id) =>
      id === 'ana'
        ? { name: 'Ana Prado', avatarUrl: null }
        : { name: 'Bia Costa', avatarUrl: null },
    ...over,
  };
}

describe('traceabilityGraph', () => {
  // feliz
  it('links the machine to its department, current and past owners, tickets, parts and tasks', () => {
    const graph = traceabilityGraph('computer:3', facts());

    expect(graph.nodes.map((node) => node.id).sort()).toEqual(
      [
        'computer:3',
        'department:7',
        'part:9',
        'person:ana',
        'person:bia',
        'task:12',
        'ticket:40',
        'ticket:56',
      ].sort(),
    );
    expect(graph.nodes.find((node) => node.id === 'person:bia')?.isPast).toBe(true);
    expect(graph.edges.find((item) => item.id === 'computer:3->ticket:56')).toMatchObject({
      isPending: true,
    });
    expect(graph.edges.find((item) => item.id === 'computer:3->ticket:40')).toMatchObject({
      isPending: false,
    });
    expect(graph.edges.find((item) => item.id === 'person:bia->computer:3')).toMatchObject({
      label: 'teve',
      isPast: true,
    });
  });

  // feliz
  it('keeps one node for the same person across two machines, current if any link is current', () => {
    const graph = traceabilityGraph(
      'person:ana',
      facts({
        computers: [
          { id: 3, label: 'A', sublabel: null, departmentId: null },
          { id: 4, label: 'B', sublabel: null, departmentId: null },
        ],
        responsibles: [
          { computerId: 3, personId: 'ana', isCurrent: false },
          { computerId: 4, personId: 'ana', isCurrent: true },
        ],
        tickets: [],
        parts: [],
        tasks: [],
      }),
    );

    expect(graph.nodes.filter((node) => node.kind === 'person')).toHaveLength(1);
    expect(graph.nodes.find((node) => node.id === 'person:ana')?.isPast).toBe(false);
    expect(graph.edges).toHaveLength(2);
  });

  // triste
  it('names a person or department that left the lists instead of dropping them', () => {
    const graph = traceabilityGraph(
      'computer:3',
      facts({ departmentName: () => null, person: () => null, tickets: [], parts: [], tasks: [] }),
    );

    expect(graph.nodes.find((node) => node.kind === 'department')?.label).toBe('Departamento 7');
    expect(graph.nodes.find((node) => node.id === 'person:ana')?.label).toBe('Fora do diretório');
  });
});
