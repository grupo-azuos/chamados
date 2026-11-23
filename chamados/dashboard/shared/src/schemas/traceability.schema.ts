import { z } from 'zod';

/**
 * O MAPA DE RASTREABILIDADE da Infraestrutura — usuário, computador e departamento, e o que
 * passou pela máquina (chamados, peças, tarefas).
 *
 * O ponto de partida é UM item: um computador, um departamento ou uma pessoa. O que está em
 * aberto (chamado aberto, tarefa pendente) vem marcado `isPending`: a tela desenha a ligação
 * tracejada e animada, como algo que ainda está acontecendo.
 */
export const TRACEABILITY_FOCUSES = ['computer', 'department', 'person'] as const;
export type TraceabilityFocus = (typeof TRACEABILITY_FOCUSES)[number];

export const TRACEABILITY_NODE_KINDS = [
  'computer',
  'person',
  'department',
  'ticket',
  'part',
  'task',
] as const;
export type TraceabilityNodeKind = (typeof TRACEABILITY_NODE_KINDS)[number];

export const traceabilityQuerySchema = z.object({
  focus: z.enum(TRACEABILITY_FOCUSES),
  id: z.string().trim().min(1, 'Escolha o ponto de partida'),
});
export type TraceabilityQuery = z.infer<typeof traceabilityQuerySchema>;

export const traceabilityNodeSchema = z.object({
  id: z.string(),
  kind: z.enum(TRACEABILITY_NODE_KINDS),
  label: z.string(),
  sublabel: z.string().nullable(),
  /** Já não vale (o responsável de antes): a tela desenha apagado. */
  isPast: z.boolean(),
  /** Em aberto: chamado aberto, tarefa pendente. */
  isPending: z.boolean(),
  /** A foto da pessoa, quando é pessoa. */
  avatarUrl: z.string().nullable(),
  /** O id do registro na tela dele (computador, chamado), quando ela existe. */
  recordId: z.number().int().nullable(),
});
export type TraceabilityNode = z.infer<typeof traceabilityNodeSchema>;

export const traceabilityEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  label: z.string().nullable(),
  isPast: z.boolean(),
  isPending: z.boolean(),
});
export type TraceabilityEdge = z.infer<typeof traceabilityEdgeSchema>;

export const traceabilityGraphSchema = z.object({
  focusId: z.string(),
  nodes: z.array(traceabilityNodeSchema),
  edges: z.array(traceabilityEdgeSchema),
});
export type TraceabilityGraph = z.infer<typeof traceabilityGraphSchema>;
