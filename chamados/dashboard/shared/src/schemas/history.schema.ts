import { z } from 'zod';

import { ROLE_CONTEXTS, type RoleContext } from '../domain/role-context.util';
import { paginatedSchema, paginationQuerySchema } from './pagination.schema';

/**
 * HISTÓRICO — quem mudou o quê e quando. Só cresce, nunca é reescrito: é o que responde "quem
 * mudou isso?" quando a equipe diz que um campo voltou atrás.
 *
 * TODO SISTEMA DO GRUPO TEM ESTE HISTÓRICO (regra `history-standard`): a tabela, a API e a tela
 * são as mesmas. O que cada um acrescenta é o VOCABULÁRIO — e é isto que mora aqui.
 *
 * No Chamados a linha não é escrita à mão por cada service: o `HistoryInterceptor` grava toda
 * requisição que muda dado, e a ação é `<recurso>.<handler>` (`tickets.update`,
 * `maintenances.create`). Por isso o vocabulário é o do RECURSO (o primeiro pedaço do endereço da
 * API) e o do VERBO do handler, e não uma lista fechada de ações.
 */

/** O que cada recurso da API é, em português — a tela nunca mostra `software-projects`. */
export const HISTORY_TARGET_LABELS: Record<string, string> = {
  tickets: 'Chamado',
  tasks: 'Tarefa',
  'task-stages': 'Etapa de tarefa',
  computers: 'Máquina',
  maintenances: 'Manutenção',
  parts: 'Peça do depósito',
  network: 'Rede',
  budget: 'Orçamento',
  traceability: 'Rastreabilidade',
  agent: 'Agente Windows',
  'software-projects': 'Sistema',
  'software-schedule': 'Cronograma',
  'software-timeline': 'Linha do tempo de sistema',
  github: 'GitHub',
  'inventory-items': 'Produto do inventário',
  'maintenance-quotes': 'Orçamento de manutenção',
  roles: 'Acesso por módulo',
  departments: 'Departamento',
  'dashboard-boards': 'Painel',
  integrations: 'Integração',
  support: 'Central de suporte',
};

/**
 * Os recursos que são de UM módulo só. Nenhum módulo invade o outro: o histórico da Manutenção
 * não mostra a máquina da Infraestrutura.
 */
export const HISTORY_MODULE_TARGETS: Record<RoleContext, readonly string[]> = {
  infra: ['computers', 'maintenances', 'parts', 'network', 'budget', 'traceability', 'agent'],
  sistema: ['software-projects', 'software-schedule', 'software-timeline', 'github', 'agent'],
  manutencao: ['inventory-items', 'maintenance-quotes'],
};

/**
 * Os recursos que existem nos três módulos e se separam pela ÁREA do registro: o chamado e a
 * tarefa de Infraestrutura são de Infraestrutura. O servidor confere a área na própria tabela.
 */
export const HISTORY_AREA_TARGETS = ['tickets', 'tasks', 'task-stages'] as const;

/** Os recursos de fora dos módulos (acessos, departamentos, painéis): aparecem nos três. */
export const HISTORY_SHARED_TARGETS = [
  'roles',
  'departments',
  'dashboard-boards',
  'integrations',
  'support',
] as const;

/** Os recursos que o histórico de um módulo mostra — os dele, os por área e os de fora. */
export function historyTargetsOf(module: RoleContext): string[] {
  return [...HISTORY_MODULE_TARGETS[module], ...HISTORY_AREA_TARGETS, ...HISTORY_SHARED_TARGETS];
}

/** O rótulo de um recurso, ou "Registro" quando ele é de uma versão mais nova. */
export function historyTargetLabel(type: string | null | undefined): string {
  return (type && HISTORY_TARGET_LABELS[type]) || 'Registro';
}

/**
 * O QUE A AÇÃO FEZ, em quatro: cadastrar, alterar, tirar de circulação e devolver. É o que a
 * tela filtra e o que dá a cor do selo; o verbo vem do nome do handler (`createMovement`,
 * `restoreSchedule`, `removeLink`).
 */
/**
 * O que a busca do Histórico procura, dito com as coisas DESTE sistema: ela procura no nome que a
 * pessoa viu (o rótulo do alvo) — o protocolo do chamado, o nome da máquina, o produto, o sistema.
 * Também é vocabulário: cada sistema troca.
 */
export const HISTORY_SEARCH_PLACEHOLDER = 'Protocolo, nome da máquina, produto ou sistema';

export const HISTORY_KINDS = ['created', 'updated', 'archived', 'restored'] as const;

export type HistoryKind = (typeof HISTORY_KINDS)[number];

export const HISTORY_KIND_LABELS: Record<HistoryKind, string> = {
  created: 'Cadastrou',
  updated: 'Alterou',
  archived: 'Arquivou',
  restored: 'Devolveu',
};

/**
 * O começo do nome do handler de cada tipo. O que não cair em nenhum (um `sync`, um `verify`) é
 * alteração: mudou dado, e é isso que o histórico conta. Vale também para o filtro no banco — o
 * servidor monta a expressão regular a partir desta mesma lista.
 */
export const HISTORY_KIND_PREFIXES: Record<Exclude<HistoryKind, 'updated'>, readonly string[]> = {
  created: ['create', 'add', 'register', 'open', 'upload', 'import'],
  archived: ['remove', 'archive', 'delete', 'dispose', 'unlink'],
  restored: ['restore', 'unarchive', 'reopen'],
};

/** O tipo da ação `tickets.createByRequester` → `created`. */
export function historyKindOf(action: string): HistoryKind {
  const handler = action.split('.')[1] ?? '';
  const kind = (Object.keys(HISTORY_KIND_PREFIXES) as Exclude<HistoryKind, 'updated'>[]).find(
    (candidate) => HISTORY_KIND_PREFIXES[candidate].some((prefix) => handler.startsWith(prefix)),
  );

  return kind ?? 'updated';
}

/**
 * `changes` guarda campo, valor anterior e valor novo, já em texto. No Chamados a mudança chega
 * pela API, então o "antes" costuma vir vazio: a linha diz o que a pessoa mandou gravar.
 */
export const historyChangeSchema = z.object({
  field: z.string(),
  from: z.string().nullable(),
  to: z.string().nullable(),
});

export type HistoryChange = z.infer<typeof historyChangeSchema>;

/** UMA LINHA DO HISTÓRICO, como a tela a mostra. */
export const historyEntrySchema = z.object({
  id: z.string(),
  action: z.string(),
  kind: z.enum(HISTORY_KINDS),
  target: z.object({ type: z.string().nullable(), id: z.string().nullable(), label: z.string().nullable() }),
  changes: z.array(historyChangeSchema),
  /** Nulo é máquina: o bot do WhatsApp, o webhook da rede, o agente dos computadores. */
  actor: z.object({ id: z.string().nullable(), name: z.string().nullable() }),
  occurredAt: z.iso.datetime({ offset: true }),
});

export type HistoryEntry = z.infer<typeof historyEntrySchema>;

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * O que a tela filtra: o MÓDULO (obrigatório — cada módulo vê o dele), o tipo do recurso, o que a
 * ação fez, quem fez (`me` é quem está vendo), o período em dias de Brasília e um texto no nome
 * do alvo. Paginada: o histórico só cresce.
 */
export const historyQuerySchema = paginationQuerySchema.extend({
  module: z.enum(ROLE_CONTEXTS),
  targetType: z.string().trim().min(1).max(60).optional(),
  kind: z.enum(HISTORY_KINDS).optional(),
  actor: z.literal('me').optional(),
  from: z.string().regex(ISO_DAY).optional(),
  to: z.string().regex(ISO_DAY).optional(),
  search: z.string().trim().max(120).optional(),
});

export type HistoryQuery = z.infer<typeof historyQuerySchema>;

export const historyPageSchema = paginatedSchema(historyEntrySchema);

export type HistoryPage = z.infer<typeof historyPageSchema>;
