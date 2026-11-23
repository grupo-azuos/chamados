import {
  TASK_LINK_KINDS,
  TASK_ORIGINS,
  TASK_STATUSES,
} from '@template/shared/domain/task-flow.util';
import { ROLE_CONTEXTS } from '@template/shared/domain/role-context.util';
import { sql } from 'drizzle-orm';
import {
  check,
  date,
  index,
  integer,
  primaryKey,
  serial,
  text,
  time,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

import { chamadosSchema } from './chamados.schema';
import { computers } from './computers.schema';
import { tickets } from './tickets.schema';

function valuesFor(values: readonly string[]) {
  return sql.raw(values.map((value) => `'${value}'`).join(', '));
}

/**
 * AS TAREFAS de cada área (ver `task-flow.util`).
 *
 * As origens automáticas têm UMA tarefa só:
 * - por chamado (`ticket_id` único) — o andamento do chamado a acompanha;
 * - por máquina EM ABERTO na manutenção (`computer_id` único enquanto não finalizada) — a
 *   próxima preventiva abre uma nova depois que esta for cumprida.
 */
export const tasks = chamadosSchema.table(
  'tasks',
  {
    id: serial('id').primaryKey(),
    area: text('area', { enum: ROLE_CONTEXTS }).notNull(),
    title: text('title').notNull(),
    description: text('description'),
    status: text('status', { enum: TASK_STATUSES }).notNull().default('open'),
    origin: text('origin', { enum: TASK_ORIGINS }).notNull().default('manual'),
    ticketId: integer('ticket_id').references(() => tickets.id, { onDelete: 'cascade' }),
    computerId: integer('computer_id').references(() => computers.id, { onDelete: 'cascade' }),
    /** O responsável, pelo ID do diretório. Nulo: ninguém pegou ainda. */
    ownerId: text('owner_id'),
    startDate: date('start_date', { mode: 'string' }).notNull(),
    dueDate: date('due_date', { mode: 'string' }),
    dueTime: time('due_time', { precision: 0 }),
    finishedAt: timestamp('finished_at', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    createdBy: text('created_by').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedBy: text('updated_by'),
  },
  (table) => [
    check('tasks_area_valid', sql`${table.area} in (${valuesFor(ROLE_CONTEXTS)})`),
    check('tasks_status_valid', sql`${table.status} in (${valuesFor(TASK_STATUSES)})`),
    check('tasks_origin_valid', sql`${table.origin} in (${valuesFor(TASK_ORIGINS)})`),
    check('tasks_title_not_blank', sql`length(btrim(${table.title})) > 0`),
    check('tasks_finished_only_done', sql`${table.finishedAt} is null or ${table.status} = 'done'`),
    check(
      'tasks_due_time_needs_day',
      sql`${table.dueTime} is null or ${table.dueDate} is not null`,
    ),
    check(
      'tasks_due_after_start',
      sql`${table.dueDate} is null or ${table.dueDate} >= ${table.startDate}`,
    ),
    check(
      'tasks_ticket_origin',
      sql`(${table.origin} = 'ticket') = (${table.ticketId} is not null)`,
    ),
    check(
      'tasks_maintenance_origin',
      sql`${table.origin} <> 'maintenance' or ${table.computerId} is not null`,
    ),
    uniqueIndex('tasks_ticket_unique')
      .on(table.ticketId)
      .where(sql`${table.ticketId} is not null`),
    uniqueIndex('tasks_open_maintenance_unique')
      .on(table.computerId)
      .where(sql`${table.origin} = 'maintenance' and ${table.status} <> 'done'`),
    index('tasks_area_status_idx').on(table.area, table.status),
    index('tasks_owner_idx').on(table.ownerId),
    index('tasks_due_date_idx').on(table.dueDate),
    index('tasks_start_date_idx').on(table.startDate),
  ],
);

export type TaskRow = typeof tasks.$inferSelect;
export type TaskInsert = typeof tasks.$inferInsert;

/** O checklist da tarefa: marcar a última etapa finaliza (ver `taskStatusAfterSteps`). */
export const taskSteps = chamadosSchema.table(
  'task_steps',
  {
    id: serial('id').primaryKey(),
    taskId: integer('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    position: integer('position').notNull(),
    doneAt: timestamp('done_at', { withTimezone: true, mode: 'date' }),
    doneBy: text('done_by'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    check('task_steps_label_not_blank', sql`length(btrim(${table.label})) > 0`),
    check('task_steps_done_pair', sql`(${table.doneAt} is null) = (${table.doneBy} is null)`),
    index('task_steps_task_idx').on(table.taskId, table.position),
  ],
);

export type TaskStepRow = typeof taskSteps.$inferSelect;

/**
 * A que a tarefa se liga — vários de cada tipo. Sem chave estrangeira de propósito: o alvo vive
 * em tabelas diferentes conforme o tipo; o nome é lido na hora, e um alvo apagado aparece sem nome.
 */
export const taskLinks = chamadosSchema.table(
  'task_links',
  {
    id: serial('id').primaryKey(),
    taskId: integer('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    kind: text('kind', { enum: TASK_LINK_KINDS }).notNull(),
    targetId: integer('target_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    createdBy: text('created_by').notNull(),
  },
  (table) => [
    check('task_links_kind_valid', sql`${table.kind} in (${valuesFor(TASK_LINK_KINDS)})`),
    uniqueIndex('task_links_target_unique').on(table.taskId, table.kind, table.targetId),
    index('task_links_target_idx').on(table.kind, table.targetId),
  ],
);

export type TaskLinkRow = typeof taskLinks.$inferSelect;

/** Quem mais participa da tarefa, além do responsável — pelo ID do diretório. */
export const taskPeople = chamadosSchema.table(
  'task_people',
  {
    taskId: integer('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    personId: text('person_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.taskId, table.personId] }),
    index('task_people_person_idx').on(table.personId),
  ],
);

export type TaskPersonRow = typeof taskPeople.$inferSelect;
