import { z } from 'zod';

import {
  SOFTWARE_PROJECT_STATUSES,
  TIMELINE_EVENT_STATUSES,
  TIMELINE_EVENT_TYPES,
} from '../domain/software-project.util';
import { TASK_STATUSES } from '../domain/task-flow.util';
import { TICKET_STATUSES } from '../domain/ticket-status.util';

/**
 * O MAPA DOS PROJETOS — cada sistema com as issues, os PRs, os merges, as releases e os deploys
 * dele, os chamados (e a issue de cada um, 1:1) e as tarefas que nasceram desses chamados. A tela
 * monta o grafo: aqui vêm os fatos.
 *
 * Do que já fechou (issue fechada, PR juntado, merge) vêm só os mais recentes de cada tipo
 * (`hiddenEvents` diz quantos ficaram de fora): o mapa de um sistema com anos de história não cabe
 * numa tela. O que está em aberto vem sempre inteiro.
 */
export const PROJECT_MAP_CLOSED_PER_TYPE = 15;

const isoDay = z.iso.date('Use uma data válida');

export const projectMapQuerySchema = z.object({
  /** O período: só o que aconteceu de `from` a `to` (os dois dias inclusos). */
  from: isoDay.optional(),
  to: isoDay.optional(),
  /** Só o que é da pessoa (pelo id): o que ela abriu ou fez no GitHub, e o chamado e a tarefa dela. */
  personId: z.string().trim().min(1).optional(),
  /** Os sistemas do mapa, separados por vírgula; sem ele, todos os em uso. */
  ids: z
    .string()
    .trim()
    .regex(/^\d+(,\d+)*$/, 'Escolha os sistemas pela lista')
    .transform((value) => value.split(',').map(Number))
    .optional(),
});

export type ProjectMapQuery = z.infer<typeof projectMapQuerySchema>;

/** O mapa de UM sistema na Central: o período e a pessoa; o sistema vem no endereço. */
export const supportProjectMapQuerySchema = projectMapQuerySchema.omit({ ids: true });
export type SupportProjectMapQuery = z.infer<typeof supportProjectMapQuerySchema>;

export const projectMapEventSchema = z.object({
  id: z.number().int(),
  type: z.enum(TIMELINE_EVENT_TYPES),
  /** `#42` (PR, issue) ou o começo do commit (merge). */
  externalId: z.string().nullable(),
  title: z.string(),
  status: z.enum(TIMELINE_EVENT_STATUSES),
  url: z.string().nullable(),
  author: z.string().nullable(),
  eventDate: z.iso.datetime({ offset: true }),
});

export type ProjectMapEvent = z.infer<typeof projectMapEventSchema>;

export const projectMapTicketSchema = z.object({
  id: z.number().int(),
  status: z.enum(TICKET_STATUSES),
  isClosed: z.boolean(),
  description: z.string(),
  /** A issue do chamado (1:1), quando ele tem. */
  githubIssueNumber: z.number().int().nullable(),
  /** Quando ele fechou: sem commit que o cite, ele se liga à primeira versão depois disso. */
  closedAt: z.iso.datetime({ offset: true }).nullable().optional(),
});

export type ProjectMapTicket = z.infer<typeof projectMapTicketSchema>;

export const projectMapTaskSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  status: z.enum(TASK_STATUSES),
  ticketId: z.number().int().nullable(),
});

export type ProjectMapTask = z.infer<typeof projectMapTaskSchema>;

/** Um commit do git graph: o hash, os pais (as linhas do grafo), a mensagem e quem fez. */
export const projectMapCommitSchema = z.object({
  sha: z.string(),
  parents: z.array(z.string()),
  message: z.string(),
  authorLogin: z.string().nullable(),
  authorName: z.string(),
  committedAt: z.iso.datetime({ offset: true }),
});

export type ProjectMapCommit = z.infer<typeof projectMapCommitSchema>;

/** Uma branch viva: a ponta e quando apareceu (a nova pulsa no mapa). */
export const projectMapBranchSchema = z.object({
  name: z.string(),
  headSha: z.string().nullable(),
  firstSeenAt: z.iso.datetime({ offset: true }),
  lastPushAt: z.iso.datetime({ offset: true }).nullable(),
});

export type ProjectMapBranch = z.infer<typeof projectMapBranchSchema>;

/** Uma versão (tag do git): a etiqueta e o commit dela. */
export const projectMapTagSchema = z.object({ name: z.string(), sha: z.string() });

export type ProjectMapTag = z.infer<typeof projectMapTagSchema>;

export const projectMapEntrySchema = z.object({
  project: z.object({
    id: z.number().int(),
    name: z.string(),
    repositoryUrl: z.string(),
    status: z.enum(SOFTWARE_PROJECT_STATUSES),
  }),
  events: z.array(projectMapEventSchema),
  /** Quantos eventos já fechados ficaram de fora (os mais antigos). */
  hiddenEvents: z.number().int().min(0),
  tickets: z.array(projectMapTicketSchema),
  tasks: z.array(projectMapTaskSchema),
  /** Os commits mais recentes (todos: o filtro de período e de pessoa do grafo é da tela, que
      precisa da história inteira para ligar os pontos que sobram). */
  commits: z.array(projectMapCommitSchema),
  branches: z.array(projectMapBranchSchema),
  tags: z.array(projectMapTagSchema).default([]),
});

export type ProjectMapEntry = z.infer<typeof projectMapEntrySchema>;

export const projectMapSchema = z.object({
  entries: z.array(projectMapEntrySchema),
  /** A conta do GitHub da pessoa do filtro (para o grafo achar os commits dela); nula sem ela. */
  personLogin: z.string().nullable(),
});

export type ProjectMap = z.infer<typeof projectMapSchema>;
