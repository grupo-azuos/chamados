import { type TraceabilityGraph } from '@template/shared/schemas/traceability.schema';
import { describe, expect, it } from 'vitest';

import {
  buildTraceabilityMap,
  openRecordOf,
  traceabilityHref,
  withoutOpenRecord,
} from './traceability-map.util';

const node = (
  id: string,
  kind: TraceabilityGraph['nodes'][number]['kind'],
  label: string,
  flags = {},
) => ({
  id,
  kind,
  label,
  sublabel: null,
  isPast: false,
  isPending: false,
  avatarUrl: null,
  recordId: Number(id.split(':')[1]) || null,
  ...flags,
});
const edge = (source: string, target: string, flags = {}) => ({
  id: `${source}->${target}`,
  source,
  target,
  label: null,
  isPast: false,
  isPending: false,
  ...flags,
});

const GRAPH: TraceabilityGraph = {
  focusId: 'department:3',
  nodes: [
    node('department:3', 'department', 'Fiscal'),
    node('person:ana', 'person', 'Ana Souza'),
    node('person:bia', 'person', 'Bia Lima', { isPast: true }),
    node('computer:1', 'computer', 'PC-FISCAL-01'),
    node('computer:2', 'computer', 'PC-FISCAL-02'),
    node('ticket:9', 'ticket', 'CH-0009', { isPending: true }),
    node('part:4', 'part', 'Monitor 24"'),
  ],
  edges: [
    edge('department:3', 'computer:1'),
    edge('department:3', 'computer:2'),
    edge('person:ana', 'computer:1'),
    edge('person:bia', 'computer:1', { isPast: true }),
    edge('computer:1', 'ticket:9', { isPending: true }),
    edge('computer:1', 'part:4'),
  ],
};

describe('traceability map', () => {
  // feliz
  it('puts each computer in an island with what passed through it, and the people beside', () => {
    const map = buildTraceabilityMap(GRAPH);

    expect(map.nodes.filter((item) => item.type === 'island').map((item) => item.id)).toEqual([
      'island:computer:1',
      'island:computer:2',
    ]);
    expect(map.nodes.find((item) => item.id === 'ticket:9')).toMatchObject({
      parentId: 'island:computer:1',
    });
    expect(map.nodes.find((item) => item.id === 'person:ana')?.parentId).toBeUndefined();
    expect(map.edges.find((item) => item.id === 'computer:1->ticket:9')).toMatchObject({
      animated: true,
    });
    expect(map.edges.find((item) => item.id === 'person:bia->computer:1')?.style).toContain(
      'opacity',
    );
  });

  // triste
  it('drops a line to a box that is not on the map, and a part has no screen to open', () => {
    const map = buildTraceabilityMap({
      ...GRAPH,
      edges: [...GRAPH.edges, edge('computer:1', 'gone:1')],
    });

    expect(map.edges.some((item) => item.target === 'gone:1')).toBe(false);
    expect(traceabilityHref(node('department:x', 'department', 'Nada'))).toBe(
      '?focus=department&id=x',
    );
    expect(openRecordOf(new URLSearchParams('ticket=abc'))).toBeNull();
    expect(buildTraceabilityMap({ focusId: 'person:x', nodes: [], edges: [] })).toEqual({
      nodes: [],
      edges: [],
    });
  });

  // feliz
  it('opens each box over the map, keeping where the map starts; people and departments restart it', () => {
    const here = new URLSearchParams('focus=computer&id=1&task=5');

    expect(traceabilityHref(node('ticket:9', 'ticket', 'CH-0009'), here)).toBe(
      '?focus=computer&id=1&ticket=9',
    );
    expect(traceabilityHref(node('part:4', 'part', 'Monitor'), here)).toBe(
      '?focus=computer&id=1&part=4',
    );
    expect(traceabilityHref(node('person:ana', 'person', 'Ana'), here)).toBe(
      '?focus=person&id=ana',
    );
    expect(openRecordOf(here)).toEqual({ kind: 'task', id: 5 });
    expect(withoutOpenRecord(here).toString()).toBe('focus=computer&id=1');
  });
});
