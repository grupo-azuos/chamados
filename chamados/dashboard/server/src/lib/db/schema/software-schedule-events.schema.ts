import {
  SCHEDULE_EVENT_CATEGORIES,
  SCHEDULE_EVENT_KINDS,
  SOFTWARE_PROJECT_COLORS,
} from '@template/shared/domain/software-project.util';
import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

import { chamadosSchema } from './chamados.schema';

import { softwareProjects } from './software-projects.schema';

const ALL_SCHEDULE_COLORS = [...SOFTWARE_PROJECT_COLORS, 'neutral', 'red'] as const;

function valuesFor(values: readonly string[]) {
  return sql.raw(values.map((value) => `'${value}'`).join(', '));
}

/**
 * Eventos da Agenda / Cronograma Semanal (Week Schedule Grid).
 */
export const softwareScheduleEvents = chamadosSchema.table(
  'software_schedule_events',
  {
    id: serial('id').primaryKey(),
    projectId: integer('project_id').references(() => softwareProjects.id, {
      onDelete: 'set null',
    }),
    /* Compromisso (início e fim) ou registro de algo feito (só o momento). Os itens de antes
       desta coluna eram todos compromissos. */
    kind: text('kind', { enum: SCHEDULE_EVENT_KINDS }).notNull().default('appointment'),
    title: text('title').notNull(),
    category: text('category', { enum: SCHEDULE_EVENT_CATEGORIES })
      .notNull()
      .default('other'),
    color: text('color', { enum: ALL_SCHEDULE_COLORS })
      .notNull()
      .default('blue'),
    date: text('date').notNull(), // Formato YYYY-MM-DD
    startTime: text('start_time').notNull(), // HH:mm
    endTime: text('end_time'), // HH:mm — nulo no registro
    note: text('note'), // a descrição

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    createdBy: text('created_by').notNull(),
    /* Quem marcou, pela identidade (id e nome do admin-console). Nulos nos agendamentos de antes
       desta coluna: para eles vale o e-mail de `createdBy`. */
    createdById: text('created_by_id'),
    createdByName: text('created_by_name'),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }),
    updatedBy: text('updated_by'),
  },
  (table) => [
    index('software_schedule_project_idx').on(table.projectId),
    index('software_schedule_date_idx').on(table.date),
    check(
      'software_schedule_category_valid',
      sql`${table.category} in (${valuesFor(SCHEDULE_EVENT_CATEGORIES)})`,
    ),
    check('software_schedule_kind_valid', sql`${table.kind} in (${valuesFor(SCHEDULE_EVENT_KINDS)})`),
    /* O compromisso sempre tem fim; o registro nunca tem. */
    check(
      'software_schedule_end_time_by_kind',
      sql`(${table.kind} = 'record') = (${table.endTime} is null)`,
    ),
    check(
      'software_schedule_color_valid',
      sql`${table.color} in (${valuesFor(ALL_SCHEDULE_COLORS)})`,
    ),
  ],
);

export type SoftwareScheduleEventRow = typeof softwareScheduleEvents.$inferSelect;
export type SoftwareScheduleEventInsert = typeof softwareScheduleEvents.$inferInsert;
