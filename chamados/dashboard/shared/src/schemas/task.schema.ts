import { z } from 'zod';

import { TASK_LINK_KINDS, TASK_ORIGINS, TASK_STATUSES } from '../domain/task-flow.util';
import { ROLE_CONTEXTS } from '../domain/role-context.util';
import { paginatedSchema, paginationQuerySchema } from './pagination.schema';

/**
 * O CONTRATO DAS TAREFAS — o mesmo schema valida a API e o formulário.
 *
 * Pessoa é sempre pelo ID do diretório (nome e foto são lidos na hora). Vínculos apontam para o
 * cadastro pelo id de cada tabela do chamados.
 */
export const TASK_TITLE_MAX = 160;
export const TASK_DESCRIPTION_MAX = 5000;
export const TASK_STEP_LABEL_MAX = 160;
export const MAX_TASK_STEPS = 30;
export const MAX_TASK_LINKS = 100;
export const MAX_TASK_PEOPLE = 30;

const isoDaySchema = z.iso.date('Use uma data válida');
const timeOfDaySchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use uma hora válida');

export const taskAreaSchema = z.enum(ROLE_CONTEXTS);
export const taskStatusSchema = z.enum(TASK_STATUSES);
export const taskOriginSchema = z.enum(TASK_ORIGINS);
export const taskLinkKindSchema = z.enum(TASK_LINK_KINDS);

const personSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  avatarUrl: z.string().nullable(),
});

export const taskStepSchema = z.object({
  id: z.number().int(),
  label: z.string(),
  position: z.number().int().min(0),
  done: z.boolean(),
  doneAt: z.iso.datetime({ offset: true }).nullable(),
  /** Quem marcou a etapa ("feita por"); nulo enquanto ela está a fazer. */
  doneBy: personSchema.nullable(),
});

export type TaskStep = z.infer<typeof taskStepSchema>;

export const taskLinkSchema = z.object({
  id: z.number().int(),
  kind: taskLinkKindSchema,
  targetId: z.number().int(),
  /** O nome do vinculado lido na hora ("CH-0056", "Computador 02"); nulo se ele sumiu. */
  label: z.string().nullable(),
});

export type TaskLink = z.infer<typeof taskLinkSchema>;

export const taskSchema = z.object({
  id: z.number().int(),
  area: taskAreaSchema,
  title: z.string(),
  description: z.string().nullable(),
  status: taskStatusSchema,
  origin: taskOriginSchema,
  /** O chamado de onde nasceu (origem `ticket`). */
  ticketId: z.number().int().nullable(),
  /** A máquina da manutenção (origem `maintenance`). */
  computerId: z.number().int().nullable(),
  owner: personSchema.nullable(),
  people: z.array(personSchema),
  startDate: isoDaySchema,
  dueDate: isoDaySchema.nullable(),
  dueTime: z.string().nullable(),
  steps: z.array(taskStepSchema),
  links: z.array(taskLinkSchema),
  progress: z.object({ done: z.number().int().min(0), total: z.number().int().min(0) }),
  finishedAt: z.iso.datetime({ offset: true }).nullable(),
  /** Quem criou ("Criada por"); nulo quando nasceu sozinha (chamado, manutenção). */
  createdBy: personSchema.nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});

export type Task = z.infer<typeof taskSchema>;

/**
 * UMA LINHA DA LINHA DO TEMPO da tarefa — o que mudou, quem mudou e quando, lido do Histórico (que
 * grava toda escrita). `action` é o nome da operação (`update`, `setStatus`, `setStepDone`…): a tela
 * a traduz em frase ("Mudou a situação da tarefa").
 */
export const taskHistoryEntrySchema = z.object({
  id: z.number().int(),
  action: z.string(),
  actorName: z.string().nullable(),
  occurredAt: z.iso.datetime({ offset: true }),
  changes: z.array(z.object({ field: z.string(), from: z.unknown(), to: z.unknown() })),
});

export type TaskHistoryEntry = z.infer<typeof taskHistoryEntrySchema>;

export const taskLinkInputSchema = z.object({
  kind: taskLinkKindSchema,
  targetId: z.coerce.number<number>().int().positive('Escolha o item pelo cadastro'),
});

export type TaskLinkInput = z.infer<typeof taskLinkInputSchema>;

const stepLabelSchema = z.string().trim().min(1, 'Dê um nome à etapa').max(TASK_STEP_LABEL_MAX);

const peopleIdsSchema = z
  .array(z.string().min(1, 'Escolha a pessoa pela lista'))
  .max(MAX_TASK_PEOPLE, `No máximo ${MAX_TASK_PEOPLE} pessoas`)
  .transform((ids) => [...new Set(ids)]);

function hasCoherentDates(
  value: { startDate?: string; dueDate?: string | null; dueTime?: string | null },
  ctx: z.RefinementCtx,
): void {
  if (value.dueTime && !value.dueDate) {
    ctx.addIssue({
      code: 'custom',
      path: ['dueTime'],
      message: 'Escolha o dia do prazo antes da hora',
    });
  }
  if (value.startDate && value.dueDate && value.dueDate < value.startDate) {
    ctx.addIssue({
      code: 'custom',
      path: ['dueDate'],
      message: 'O prazo não pode ser antes do início',
    });
  }
}

export const createTaskSchema = z
  .object({
    area: taskAreaSchema,
    title: z.string().trim().min(2, 'Dê um título à tarefa').max(TASK_TITLE_MAX),
    description: z.string().trim().max(TASK_DESCRIPTION_MAX).nullish(),
    /** Sem responsável escolhido, a tarefa fica com quem criou. */
    ownerId: z.string().min(1).nullish(),
    startDate: isoDaySchema,
    dueDate: isoDaySchema.nullish(),
    dueTime: timeOfDaySchema.nullish(),
    steps: z
      .array(stepLabelSchema)
      .max(MAX_TASK_STEPS, `No máximo ${MAX_TASK_STEPS} etapas`)
      .optional(),
    links: z.array(taskLinkInputSchema).max(MAX_TASK_LINKS).optional(),
    peopleIds: peopleIdsSchema.optional(),
  })
  .superRefine(hasCoherentDates);

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z
  .object({
    title: z.string().trim().min(2, 'Dê um título à tarefa').max(TASK_TITLE_MAX).optional(),
    description: z.string().trim().max(TASK_DESCRIPTION_MAX).nullish(),
    ownerId: z.string().min(1).nullish(),
    startDate: isoDaySchema.optional(),
    dueDate: isoDaySchema.nullish(),
    dueTime: timeOfDaySchema.nullish(),
    peopleIds: peopleIdsSchema.optional(),
  })
  .superRefine(hasCoherentDates)
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'Nada para gravar.',
  });

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const setTaskStatusSchema = z.object({ status: z.enum(['done', 'reopened']) });
export type SetTaskStatusInput = z.infer<typeof setTaskStatusSchema>;

export const saveTaskStepsSchema = z.object({
  steps: z
    .array(z.object({ id: z.number().int().optional(), label: stepLabelSchema }))
    .max(MAX_TASK_STEPS, `No máximo ${MAX_TASK_STEPS} etapas`),
});
export type SaveTaskStepsInput = z.infer<typeof saveTaskStepsSchema>;

export const setTaskStepDoneSchema = z.object({ done: z.boolean() });
export type SetTaskStepDoneInput = z.infer<typeof setTaskStepDoneSchema>;

export const addTaskLinksSchema = z.object({
  links: z.array(taskLinkInputSchema).min(1, 'Escolha ao menos um vínculo').max(MAX_TASK_LINKS),
});
export type AddTaskLinksInput = z.infer<typeof addTaskLinksSchema>;

const flagSchema = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true')
  .optional();

export const taskListQuerySchema = paginationQuerySchema.extend({
  area: taskAreaSchema,
  status: taskStatusSchema.optional(),
  origin: taskOriginSchema.optional(),
  ownerId: z.string().min(1).optional(),
  /** Só as tarefas de quem pergunta (como dono ou participante). */
  mine: flagSchema,
  linkKind: taskLinkKindSchema.optional(),
  linkId: z.coerce.number<number>().int().positive().optional(),
  search: z.string().trim().max(TASK_TITLE_MAX).optional(),
  overdue: flagSchema,
  /** O recorte do calendário e da timeline: tarefas que tocam o intervalo. */
  from: isoDaySchema.optional(),
  to: isoDaySchema.optional(),
});

export type TaskListQuery = z.infer<typeof taskListQuerySchema>;

export const taskPageSchema = paginatedSchema(taskSchema).extend({
  /** Atrasadas e vencendo na semana, no recorte — o número piscando da tela. */
  alerts: z.object({ overdue: z.number().int().min(0), dueSoon: z.number().int().min(0) }),
});

export type TaskPage = z.infer<typeof taskPageSchema>;
