import {
  type TraceabilityEdge,
  type TraceabilityGraph,
  type TraceabilityNode,
} from '../schemas/traceability.schema';

/**
 * MONTA O GRAFO a partir dos fatos já lidos do banco — sem banco, para dar para testar a regra.
 *
 * Os ids dos nós são `<tipo>:<id>`, o que junta sozinho o mesmo item que aparece por dois
 * caminhos (a mesma pessoa responsável por duas máquinas vira um nó só, com duas ligações).
 */
export type TraceabilityFacts = {
  computers: { id: number; label: string; sublabel: string | null; departmentId: number | null }[];
  /** Os períodos de cada responsável; `isCurrent` = o de agora. */
  responsibles: { computerId: number; personId: string; isCurrent: boolean }[];
  tickets: { id: number; computerId: number; protocol: string; title: string; isOpen: boolean }[];
  parts: { partId: number; computerId: number; name: string; quantity: number }[];
  tasks: { id: number; computerId: number; title: string; isOpen: boolean }[];
  departmentName: (id: number) => string | null;
  person: (id: string) => { name: string; avatarUrl: string | null } | null;
};

type NodeInput = Omit<TraceabilityNode, 'isPast' | 'isPending' | 'avatarUrl' | 'recordId'> &
  Partial<TraceabilityNode>;

/** O grafo em montagem: nós e ligações sem repetir, pelo id. */
class GraphBuilder {
  readonly nodes = new Map<string, TraceabilityNode>();
  readonly edges = new Map<string, TraceabilityEdge>();

  node(value: NodeInput): void {
    this.nodes.set(value.id, {
      isPast: false,
      isPending: false,
      avatarUrl: null,
      recordId: null,
      ...value,
    });
  }

  edge(
    source: string,
    target: string,
    label: string | null,
    flags: Partial<TraceabilityEdge> = {},
  ): void {
    const id = `${source}->${target}`;
    this.edges.set(id, { id, source, target, label, isPast: false, isPending: false, ...flags });
  }
}

function addComputers(graph: GraphBuilder, facts: TraceabilityFacts): void {
  for (const computer of facts.computers) {
    const computerId = `computer:${computer.id}`;
    graph.node({
      id: computerId,
      kind: 'computer',
      label: computer.label,
      sublabel: computer.sublabel,
      recordId: computer.id,
    });
    if (computer.departmentId === null) continue;
    const departmentId = `department:${computer.departmentId}`;
    graph.node({
      id: departmentId,
      kind: 'department',
      label: facts.departmentName(computer.departmentId) ?? `Departamento ${computer.departmentId}`,
      sublabel: null,
    });
    graph.edge(departmentId, computerId, 'departamento');
  }
}

/** A mesma pessoa vira um nó só; é "de antes" só se nenhuma ligação dela for atual. */
function addResponsibles(graph: GraphBuilder, facts: TraceabilityFacts): void {
  for (const period of facts.responsibles) {
    const personId = `person:${period.personId}`;
    const person = facts.person(period.personId);
    const wasPast = graph.nodes.get(personId)?.isPast ?? true;
    graph.node({
      id: personId,
      kind: 'person',
      label: person?.name ?? 'Fora do diretório',
      sublabel: null,
      avatarUrl: person?.avatarUrl ?? null,
      isPast: wasPast && !period.isCurrent,
    });
    graph.edge(
      personId,
      `computer:${period.computerId}`,
      period.isCurrent ? 'responsável' : 'teve',
      {
        isPast: !period.isCurrent,
      },
    );
  }
}

function addWork(graph: GraphBuilder, facts: TraceabilityFacts): void {
  for (const ticket of facts.tickets) {
    const ticketId = `ticket:${ticket.id}`;
    graph.node({
      id: ticketId,
      kind: 'ticket',
      label: ticket.protocol,
      sublabel: ticket.title,
      isPending: ticket.isOpen,
      recordId: ticket.id,
    });
    graph.edge(`computer:${ticket.computerId}`, ticketId, 'chamado', { isPending: ticket.isOpen });
  }
  for (const part of facts.parts) {
    const partId = `part:${part.partId}`;
    graph.node({
      id: partId,
      kind: 'part',
      label: part.name,
      sublabel: null,
      recordId: part.partId,
    });
    graph.edge(`computer:${part.computerId}`, partId, `${part.quantity} un.`);
  }
  for (const task of facts.tasks) {
    const taskId = `task:${task.id}`;
    graph.node({
      id: taskId,
      kind: 'task',
      label: task.title,
      sublabel: null,
      isPending: task.isOpen,
      recordId: task.id,
    });
    graph.edge(`computer:${task.computerId}`, taskId, 'tarefa', { isPending: task.isOpen });
  }
}

export function traceabilityGraph(focusId: string, facts: TraceabilityFacts): TraceabilityGraph {
  const graph = new GraphBuilder();
  addComputers(graph, facts);
  addResponsibles(graph, facts);
  addWork(graph, facts);

  return { focusId, nodes: [...graph.nodes.values()], edges: [...graph.edges.values()] };
}
