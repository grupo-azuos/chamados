import { z } from 'zod';

import {
  SCHEDULE_EVENT_CATEGORIES,
  SCHEDULE_EVENT_KINDS,
  SOFTWARE_PROJECT_COLORS,
  scheduleEndTimeError,
} from '../domain/software-project.util';

export const scheduleCategorySchema = z.enum(SCHEDULE_EVENT_CATEGORIES);
export const scheduleKindSchema = z.enum(SCHEDULE_EVENT_KINDS);
export const scheduleColorSchema = z.enum(
  [...SOFTWARE_PROJECT_COLORS, 'neutral', 'red'] as const,
);

export const softwareScheduleEventSchema = z.object({
  id: z.number().int(),
  projectId: z.number().int().nullable(),
  projectName: z.string().nullable().optional(),
  kind: scheduleKindSchema,
  title: z.string().min(1),
  category: scheduleCategorySchema,
  color: scheduleColorSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data no formato YYYY-MM-DD'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Horário no formato HH:mm'),
  /** Nulo no registro: ele marca só o momento em que algo foi feito. */
  endTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Horário no formato HH:mm')
    .nullable(),
  /** A descrição do item (a coluna guarda o nome antigo, de quando era "Observações"). */
  note: z.string().nullable(),
  createdAt: z.string().datetime(),
  /** Quem marcou — para a tela mostrar e decidir se oferece alterar e excluir. */
  createdById: z.string().nullable(),
  createdByEmail: z.string(),
  createdByName: z.string(),
});

export type SoftwareScheduleEvent = z.infer<typeof softwareScheduleEventSchema>;

const softwareScheduleEventInputSchema = z.object({
  kind: scheduleKindSchema.default('appointment'),
  projectId: z.number().int().optional().nullable(),
  title: z
    .string({ required_error: 'Informe o título do compromisso' })
    .trim()
    .min(1, 'Informe o título do compromisso'),
  category: scheduleCategorySchema.default('other'),
  color: scheduleColorSchema.default('blue'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data no formato YYYY-MM-DD'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Horário inicial no formato HH:mm'),
  endTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Horário final no formato HH:mm')
    .optional()
    .nullable(),
  note: z.string().trim().optional().nullable(),
});

/** Aponta o erro do fim no campo "Fim", onde a pessoa vai corrigir. */
function refineEndTime(
  input: { kind: 'appointment' | 'record'; startTime: string; endTime?: string | null },
  ctx: z.RefinementCtx,
) {
  const message = scheduleEndTimeError(input);
  if (!message) return;

  ctx.addIssue({ code: 'custom', path: ['endTime'], message });
}

/* O compromisso precisa do fim, depois do início; o registro não tem fim (o servidor descarta
   o que vier). */
export const createSoftwareScheduleEventSchema =
  softwareScheduleEventInputSchema.superRefine(refineEndTime);

export type CreateSoftwareScheduleEventInput = z.infer<typeof createSoftwareScheduleEventSchema>;

/* Na alteração, o fim só é cobrado depois de juntar com o que já está gravado — no serviço. */
export const updateSoftwareScheduleEventSchema = softwareScheduleEventInputSchema.partial();
export type UpdateSoftwareScheduleEventInput = z.infer<typeof updateSoftwareScheduleEventSchema>;

export const softwareScheduleQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type SoftwareScheduleQuery = z.infer<typeof softwareScheduleQuerySchema>;

export const softwareScheduleFormSchema = z
  .object({
    kind: scheduleKindSchema,
    projectId: z.number().int().nullable().optional(),
    title: z.string().trim().min(1, 'Informe o título do compromisso'),
    category: scheduleCategorySchema,
    color: scheduleColorSchema,
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data no formato AAAA-MM-DD'),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Início no formato HH:mm'),
    /* Sempre preenchido no formulário, mesmo no registro: se a pessoa trocar para compromisso,
     o fim já está lá. Quem decide se ele vai para a API é o hook. */
    endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Fim no formato HH:mm'),
    note: z.string().trim().optional(),
  })
  .superRefine(refineEndTime);

export type SoftwareScheduleForm = z.infer<typeof softwareScheduleFormSchema>;
