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

export const projectMapQuerySchema = z.object({
  /** Os sistemas do mapa, separados por vírgula; sem ele, todos os em uso. */
  ids: z
    .string()
    .trim()
    .regex(/^\d+(,\d+)*$/, 'Escolha os sistemas pela lista')
    .transform((value) => value.split(',').map(Number))
    .optional(),
});

export type ProjectMapQuery = z.infer<typeof projectMapQuerySchema>;

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
});

export type ProjectMapTicket = z.infer<typeof projectMapTicketSchema>;

export const projectMapTaskSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  status: z.enum(TASK_STATUSES),
  ticketId: z.number().int().nullable(),
});

export type ProjectMapTask = z.infer<typeof projectMapTaskSchema>;

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
});

export type ProjectMapEntry = z.infer<typeof projectMapEntrySchema>;

export const projectMapSchema = z.array(projectMapEntrySchema);

export type ProjectMap = z.infer<typeof projectMapSchema>;
