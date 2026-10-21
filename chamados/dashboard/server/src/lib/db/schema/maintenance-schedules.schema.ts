import { date, index, integer, serial, text, timestamp } from 'drizzle-orm/pg-core';

import { chamadosSchema } from './chamados.schema';

import { computers } from './computers.schema';

/**
 * A MANUTENÇÃO AGENDADA: o dia em que alguém combinou de abrir a máquina.
 *
 * **Uma por máquina** (`unique` em `computer_id`). Agendamento é compromisso, não fila: duas
 * datas para a mesma máquina deixariam a ficha sem saber qual mostrar, e "remarcar" vira
 * trocar a data da linha que já existe.
 *
 * **A linha some quando o compromisso termina** — cumprido (alguém registrou a manutenção
 * dela) ou cancelado. O que foi FEITO mora no histórico de manutenções; aqui fica só o que
 * ainda VAI ser feito, e é isso que faz a tela responder "tem algo marcado?" com uma consulta
 * só, sem filtrar passado.
 *
 * `date` e não `timestamp`: agenda-se um DIA, não um instante. Guardando instante, a meia-noite
 * de um fuso vira o dia anterior em outro, e a máquina apareceria agendada para a véspera.
 */
export const maintenanceSchedules = chamadosSchema.table(
  'maintenance_schedules',
  {
    id: serial('id').primaryKey(),

    computerId: integer('computer_id')
      .notNull()
      .unique()
      .references(() => computers.id, { onDelete: 'restrict' }),
    scheduledFor: date('scheduled_for', { mode: 'string' }).notNull(),
    /* O que se pretende fazer — "trocar pasta térmica". Opcional: às vezes é só a preventiva. */
    note: text('note'),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    createdBy: text('created_by').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }),
    updatedBy: text('updated_by'),
  },
  (table) => [
    /* O painel e a tela de Manutenção listam pela data: o que vem primeiro, primeiro. */
    index('maintenance_schedules_scheduled_for_idx').on(table.scheduledFor),
  ],
);

export type MaintenanceScheduleRow = typeof maintenanceSchedules.$inferSelect;
export type MaintenanceScheduleInsert = typeof maintenanceSchedules.$inferInsert;
