import {
  type BoardFilter,
  type FilterGroup,
  type LayoutItem,
  type Widget,
} from '@template/shared/schemas/dashboard-board.schema';
import { index, jsonb, serial, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

import { archiveColumns } from '../archive.util';
import { dashboardSchema } from './schemas.schema';

/**
 * OS PAINÉIS MONTADOS — por MÓDULO e por contexto: em cada módulo, `team` e `manager` têm um só
 * (dono nulo), e `personal` tem um por pessoa. O painel da Infraestrutura e o da Manutenção são
 * linhas diferentes, e nenhum enxerga o outro.
 *
 * O conteúdo (blocos, lugares e filtros) é JSON validado pelo contrato antes de gravar; o banco
 * garante só que não há dois painéis no mesmo lugar. `nullsNotDistinct`: sem ele, o Postgres
 * deixaria dois painéis da Equipe (dono nulo nos dois) no mesmo módulo.
 */
export const dashboardBoards = dashboardSchema.table(
  'dashboard_boards',
  {
    id: serial('id').primaryKey(),
    module: text('module', { enum: ['infra', 'sistema', 'manutencao'] }).notNull(),
    scope: text('scope', { enum: ['team', 'manager', 'personal'] }).notNull(),
    /** O id do admin-console de quem é dono — só no Pessoal. */
    ownerId: text('owner_id'),
    widgets: jsonb('widgets').$type<Widget[]>().notNull(),
    layout: jsonb('layout').$type<LayoutItem[]>().notNull(),
    filters: jsonb('filters').$type<BoardFilter[]>().notNull().default([]),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedBy: text('updated_by'),
  },
  (table) => [
    unique('dashboard_boards_module_scope_owner')
      .on(table.module, table.scope, table.ownerId)
      .nullsNotDistinct(),
  ],
);

export type DashboardBoardRow = typeof dashboardBoards.$inferSelect;

/**
 * OS FILTROS SALVOS — montados uma vez, servem a qualquer bloco do módulo. `personal` só quem
 * criou vê; `shared` o módulo vê, e só quem criou (ou o administrador do módulo) muda. Não se
 * apagam: arquivam.
 */
export const savedFilters = dashboardSchema.table(
  'saved_filters',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    module: text('module', { enum: ['infra', 'sistema', 'manutencao'] }).notNull(),
    name: text('name').notNull(),
    description: text('description'),
    source: text('source').notNull(),
    scope: text('scope', { enum: ['personal', 'shared'] }).notNull(),
    tree: jsonb('tree').$type<FilterGroup>().notNull(),
    ownerId: text('owner_id').notNull(),
    ownerName: text('owner_name'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    ...archiveColumns(),
  },
  (table) => [
    index('saved_filters_module_idx').on(table.module),
    index('saved_filters_owner_idx').on(table.ownerId),
  ],
);

export type SavedFilterRow = typeof savedFilters.$inferSelect;
