import { type TraceabilityGraph } from '@template/shared/schemas/traceability.schema';

type GraphNode = TraceabilityGraph['nodes'][number];

const node = (
  id: string,
  kind: GraphNode['kind'],
  label: string,
  over: Partial<GraphNode> = {},
): GraphNode => ({
  id,
  kind,
  label,
  sublabel: null,
  isPast: false,
  isPending: false,
  avatarUrl: null,
  recordId: Number(id.split(':')[1]) || null,
  ...over,
});

const edge = (
  source: string,
  target: string,
  label: string,
  over: { isPast?: boolean; isPending?: boolean } = {},
) => ({
  id: `${source}->${target}`,
  source,
  target,
  label,
  isPast: false,
  isPending: false,
  ...over,
});

/** Um departamento com duas máquinas: a primeira com um chamado aberto, um monitor e quem teve antes. */
export function traceabilityGraphFixture(): TraceabilityGraph {
  return {
    focusId: 'department:3',
    nodes: [
      node('department:3', 'department', 'Fiscal'),
      node('person:ana', 'person', 'Ana Souza'),
      node('person:bia', 'person', 'Bia Lima', { isPast: true }),
      node('computer:1', 'computer', 'PC-FISCAL-01', { sublabel: 'Dell OptiPlex' }),
      node('computer:2', 'computer', 'PC-FISCAL-02', { sublabel: 'Lenovo M70' }),
      node('ticket:9', 'ticket', 'CH-0009', { sublabel: 'Monitor piscando', isPending: true }),
      node('task:5', 'task', 'Trocar o monitor', { isPending: true }),
      node('part:4', 'part', 'Monitor 24"'),
    ],
    edges: [
      edge('department:3', 'computer:1', 'departamento'),
      edge('department:3', 'computer:2', 'departamento'),
      edge('person:ana', 'computer:1', 'responsável'),
      edge('person:bia', 'computer:1', 'teve', { isPast: true }),
      edge('computer:1', 'ticket:9', 'chamado', { isPending: true }),
      edge('computer:1', 'task:5', 'tarefa', { isPending: true }),
      edge('computer:1', 'part:4', '2 un.'),
    ],
  };
}
