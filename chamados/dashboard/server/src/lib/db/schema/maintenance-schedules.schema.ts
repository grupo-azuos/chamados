import { isNull } from 'drizzle-orm';
import { date, index, integer, serial, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

import { archiveColumns } from '../archive.util';
import { maintenanceSchema } from './schemas.schema';

import { computers } from './computers.schema';

/**
 * A MANUTENÇÃO AGENDADA: o dia em que alguém combinou de abrir a máquina.
 *
 * **Uma em aberto por máquina** (índice único em `computer_id` entre as não arquivadas). Agendamento é compromisso, não fila: duas
 * datas para a mesma máquina deixariam a ficha sem saber qual mostrar, e "remarcar" vira
 * trocar a data da linha que já existe.
 *
 * **A linha é arquivada quando o compromisso termina** — cumprido (alguém registrou a
 * manutenção dela) ou cancelado. Nada se apaga: o arquivado sai da agenda, fica guardado com
 * quem e quando, e o cancelado volta pelo "Desfazer". O que foi FEITO mora no histórico de
 * manutenções; a agenda mostra só o que ainda VAI ser feito.
 *
 * `date` e não `timestamp`: agenda-se um DIA, não um instante. Guardando instante, a meia-noite
 * de um fuso vira o dia anterior em outro, e a máquina apareceria agendada para a véspera.
 */
export const maintenanceSchedules = maintenanceSchema.table(
  'maintenance_schedules',
  {
    id: serial('id').primaryKey(),

    computerId: integer('computer_id')
      .notNull()
      .references(() => computers.id, { onDelete: 'restrict' }),
    scheduledFor: date('scheduled_for', { mode: 'string' }).notNull(),
    /* O que se pretende fazer — "trocar pasta térmica". Opcional: às vezes é só a preventiva. */
    note: text('note'),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    createdBy: text('created_by').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }),
    updatedBy: text('updated_by'),
    ...archiveColumns(),
  },
  (table) => [
    /* Uma em aberto por máquina; as arquivadas (cumpridas e canceladas) não contam. */
    uniqueIndex('maintenance_schedules_open_computer_unique')
      .on(table.computerId)
      .where(isNull(table.archivedAt)),
    /* O painel e a tela de Manutenção listam pela data: o que vem primeiro, primeiro. */
    index('maintenance_schedules_scheduled_for_idx').on(table.scheduledFor),
  ],
);

export type MaintenanceScheduleRow = typeof maintenanceSchedules.$inferSelect;
export type MaintenanceScheduleInsert = typeof maintenanceSchedules.$inferInsert;
