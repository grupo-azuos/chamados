import { z } from 'zod';

import { ROLE_CONTEXTS } from '../domain/role-context.util';
import { TASK_STATUS_LABELS } from '../domain/task-flow.util';

/**
 * AS SITUAÇÕES PRÓPRIAS DA TAREFA (as do Paralegal) — as que a equipe de cada área cria
 * ("Aguardando peça", "Com o fornecedor"): nome e cor.
 *
 * As três fixas (Aberta, Reaberta, Finalizada) NÃO estão aqui e não mudam: são elas que andam junto
 * com o chamado e a manutenção. A própria fica ENTRE elas — uma coluna do quadro depois de Reaberta
 * e antes de Finalizada —, e a tarefa nela continua aberta (ou reaberta) por baixo. Finalizar tira a
 * tarefa da própria; arquivar a própria devolve as tarefas dela à coluna fixa de cada uma.
 */
export const TASK_STAGE_LABEL_MAX = 40;

const FIXED_LABELS = Object.values(TASK_STATUS_LABELS).map((label) => label.toLowerCase());

const labelSchema = z
  .string()
  .trim()
  .min(1, 'Informe o nome da situação')
  .max(TASK_STAGE_LABEL_MAX, `No máximo ${TASK_STAGE_LABEL_MAX} letras`)
  .refine((label) => !FIXED_LABELS.includes(label.toLowerCase()), {
    message: 'Esse nome é de uma situação fixa',
  });

const colorSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^#[0-9a-f]{6}$/, 'Escolha uma cor');

/** A situação como a tarefa a mostra. */
export const taskStageRefSchema = z.object({
  id: z.number().int().positive(),
  label: z.string(),
  color: z.string(),
});

export type TaskStageRef = z.infer<typeof taskStageRefSchema>;

/** A situação no catálogo da área — com o lugar entre as colunas. */
export const taskStageSchema = taskStageRefSchema.extend({
  area: z.enum(ROLE_CONTEXTS),
  position: z.number().int(),
});

export type TaskStage = z.infer<typeof taskStageSchema>;

export const taskStageListQuerySchema = z.object({ area: z.enum(ROLE_CONTEXTS) });

export type TaskStageListQuery = z.infer<typeof taskStageListQuerySchema>;

export const createTaskStageSchema = z.object({
  area: z.enum(ROLE_CONTEXTS),
  label: labelSchema,
  color: colorSchema,
});

export type CreateTaskStageInput = z.infer<typeof createTaskStageSchema>;

export const updateTaskStageSchema = z
  .object({ label: labelSchema.optional(), color: colorSchema.optional() })
  .refine((input) => input.label !== undefined || input.color !== undefined, {
    message: 'Mude o nome ou a cor',
  });

export type UpdateTaskStageInput = z.infer<typeof updateTaskStageSchema>;

/** Anda a coluna uma casa para a esquerda (-1) ou para a direita (1). */
export const moveTaskStageSchema = z.object({ direction: z.union([z.literal(-1), z.literal(1)]) });

export type MoveTaskStageInput = z.infer<typeof moveTaskStageSchema>;

/** Põe a tarefa numa situação própria, ou (`null`) a devolve à coluna fixa dela. */
export const setTaskStageSchema = z.object({ stageId: z.number().int().positive().nullable() });

export type SetTaskStageInput = z.infer<typeof setTaskStageSchema>;
