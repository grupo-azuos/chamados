import { Inject, Injectable } from '@nestjs/common';
import { type ArchivedFilter } from '@template/shared/schemas/archive.schema';
import {
  type BoardModule,
  type DashboardScope,
  type FilterGroup,
  type SaveBoardInput,
  type SaveFilterInput,
} from '@template/shared/schemas/dashboard-board.schema';
import { and, asc, eq, isNull, or, sql, type SQL } from 'drizzle-orm';

import { archivedCondition, archiveValues } from '../../../lib/db/archive.util';
import { runMaybe, runQuery } from '../../../lib/db/db-error.util';
import { DB } from '../../../lib/db/db.token';
import { type Database } from '../../../lib/db/db.type';
import {
  dashboardBoards,
  type DashboardBoardRow,
  savedFilters,
  type SavedFilterRow,
} from '../../../lib/db/schema/dashboard-boards.schema';
import { filterToSql } from './filter-sql.util';
import { type SourceTable } from './widget-sources';

/** Quantos grupos um bloco recebe no máximo: mais que isso não se lê num gráfico. */
export const MAX_GROUPS = 200;

@Injectable()
export class DashboardBoardsRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  findBoard(
    module: BoardModule,
    scope: DashboardScope,
    ownerId: string | null,
  ): Promise<DashboardBoardRow | null> {
    return runMaybe(
      this.db
        .select()
        .from(dashboardBoards)
        .where(
          and(eq(dashboardBoards.module, module), eq(dashboardBoards.scope, scope), ownerOf(ownerId)),
        )
        .limit(1),
      'ler o dashboard',
    );
  }

  /** Grava o painel do módulo e do contexto — o primeiro salvamento cria, os seguintes trocam. */
  async saveBoard(
    module: BoardModule,
    scope: DashboardScope,
    ownerId: string | null,
    board: SaveBoardInput,
    actorId: string,
  ): Promise<DashboardBoardRow> {
    const values = {
      widgets: board.widgets,
      layout: board.layout,
      filters: board.filters,
      updatedAt: new Date(),
      updatedBy: actorId,
    };
    const [row] = await runQuery(
      this.db
        .insert(dashboardBoards)
        .values({ module, scope, ownerId, ...values })
        .onConflictDoUpdate({
          target: [dashboardBoards.module, dashboardBoards.scope, dashboardBoards.ownerId],
          set: values,
        })
        .returning(),
      'salvar o dashboard',
    );
    if (!row) throw new Error('Dashboard upsert returned no row');

    return row;
  }

  /** Os filtros do módulo que a pessoa vê: os dela e os compartilhados. */
  listFilters(
    module: BoardModule,
    viewerId: string,
    archived: ArchivedFilter,
  ): Promise<SavedFilterRow[]> {
    return runQuery(
      this.db
        .select()
        .from(savedFilters)
        .where(
          and(
            eq(savedFilters.module, module),
            or(eq(savedFilters.ownerId, viewerId), eq(savedFilters.scope, 'shared')),
            archivedCondition(savedFilters.archivedAt, archived),
          ),
        )
        .orderBy(asc(savedFilters.name)),
      'listar os filtros',
    );
  }

  findFilter(id: string): Promise<SavedFilterRow | null> {
    return runMaybe(
      this.db.select().from(savedFilters).where(eq(savedFilters.id, id)).limit(1),
      'ler o filtro',
    );
  }

  async insertFilter(
    module: BoardModule,
    input: SaveFilterInput,
    owner: { id: string; name: string },
  ): Promise<SavedFilterRow> {
    const [row] = await runQuery(
      this.db
        .insert(savedFilters)
        .values({
          module,
          name: input.name,
          description: input.description ?? null,
          source: input.source,
          scope: input.scope,
          tree: input.tree,
          ownerId: owner.id,
          ownerName: owner.name,
        })
        .returning(),
      'salvar o filtro',
    );
    if (!row) throw new Error('Filter insert returned no row');

    return row;
  }

  updateFilter(id: string, input: SaveFilterInput): Promise<SavedFilterRow | null> {
    return runMaybe(
      this.db
        .update(savedFilters)
        .set({
          name: input.name,
          description: input.description ?? null,
          source: input.source,
          scope: input.scope,
          tree: input.tree,
          updatedAt: new Date(),
        })
        .where(eq(savedFilters.id, id))
        .returning(),
      'salvar o filtro',
    );
  }

  setFilterArchived(
    id: string,
    archived: boolean,
    actorId: string,
  ): Promise<SavedFilterRow | null> {
    return runMaybe(
      this.db
        .update(savedFilters)
        .set(archiveValues(archived, actorId))
        .where(eq(savedFilters.id, id))
        .returning(),
      archived ? 'arquivar o filtro' : 'desarquivar o filtro',
    );
  }

  /**
   * Os números de um bloco: quantos há no recorte (filtro, "só os meus", período), quantos há
   * na fonte inteira, e — se agrupa — quantos por grupo. Categoria vem do maior para o menor;
   * tempo, em ordem de data, sem os sem data. Com `split`, também o cruzamento das duas.
   */
  async countBy(
    source: SourceTable,
    query: {
      tree: FilterGroup | null;
      extra: SQL | undefined;
      /** O que é da fonte e vale também para o total inteiro (os status que pagam, na premiação). */
      base?: SQL | undefined;
      dimension: CountDimension | null;
      split: CountDimension | null;
    },
  ): Promise<CountedWidget> {
    const where = this.conditionOf(source, query);
    const [counted] = await runQuery(
      this.db
        .select({
          total: sql<number>`(count(*) filter (where ${where}))::int`,
          grandTotal: sql<number>`count(*)::int`,
        })
        .from(source.table)
        .where(and(source.inCirculation, query.base)),
      'contar o bloco',
    );
    const totals = { total: counted?.total ?? 0, grandTotal: counted?.grandTotal ?? 0 };
    if (!query.dimension) return { ...totals, groups: [], cells: [] };

    const [groups, cells] = await Promise.all([
      this.groupRows(source, where, query.dimension),
      query.split ? this.cellRows(source, where, query.dimension, query.split) : [],
    ]);

    return { ...totals, groups, cells };
  }

  /**
   * A condição do recorte de um bloco sobre a tabela da fonte: o que está em circulação, o que é
   * da fonte, o filtro em árvore e o resto. É o `where` da contagem — e o que a lista aberta pelo
   * clique no bloco junta ao dela.
   */
  conditionOf(
    source: SourceTable,
    query: { tree: FilterGroup | null; extra: SQL | undefined; base?: SQL | undefined },
  ): SQL {
    return (
      and(
        source.inCirculation,
        query.base,
        query.tree ? filterToSql(source, query.tree) : undefined,
        query.extra,
      ) ?? sql`true`
    );
  }

  private async groupRows(
    source: SourceTable,
    where: SQL | undefined,
    dimension: CountDimension,
  ): Promise<{ key: string; value: number }[]> {
    const key = sql<string>`${dimension.expression}`;
    const rows = await runQuery(
      this.db
        .select({ key, value: sql<number>`count(*)::int` })
        .from(source.table)
        .where(dimension.isTime ? and(where, sql`${dimension.expression} is not null`) : where)
        /* Pela POSIÇÃO, e não repetindo a expressão: com parâmetro dentro (o fuso do mês),
           o group by sairia com `$5…` e o select com `$1…`, e o Postgres não as reconhece como a
           mesma coluna. */
        .groupBy(sql`1`)
        /* No tempo e nas faixas de idade, a ordem é a da chave; nas categorias, a do tamanho. */
        .orderBy(dimension.isTime || dimension.isOrdered ? sql`1 asc` : sql`2 desc, 1 asc`)
        .limit(MAX_GROUPS),
      'agrupar o bloco',
    );

    return rows.map((row) => ({ key: String(row.key), value: row.value }));
  }

  private async cellRows(
    source: SourceTable,
    where: SQL | undefined,
    dimension: CountDimension,
    split: CountDimension,
  ): Promise<{ key: string; key2: string; value: number }[]> {
    const key = sql<string>`${dimension.expression}`;
    const key2 = sql<string>`${split.expression}`;
    const rows = await runQuery(
      this.db
        .select({ key, key2, value: sql<number>`count(*)::int` })
        .from(source.table)
        .where(where)
        .groupBy(sql`1, 2`)
        .orderBy(sql`3 desc`)
        .limit(MAX_CELLS),
      'cruzar o bloco',
    );

    return rows.map((row) => ({ key: String(row.key), key2: String(row.key2), value: row.value }));
  }
}

/**
 * `isOrdered`: os grupos vêm na ordem da chave (as faixas de idade), e não do maior ao menor.
 * `scope`: só os registros que o agrupamento conta (as tarefas não finalizadas, nos dias em
 * aberto) — os outros ficam fora do bloco.
 */
export type CountDimension = {
  key: string;
  expression: SQL;
  isTime: boolean;
  isOrdered?: boolean;
  scope?: SQL;
};

export type CountedWidget = {
  total: number;
  grandTotal: number;
  groups: { key: string; value: number }[];
  cells: { key: string; key2: string; value: number }[];
};

/** Quantas células um cruzamento recebe no máximo: um mapa de calor maior não se lê. */
export const MAX_CELLS = 600;

function ownerOf(ownerId: string | null): SQL | undefined {
  return ownerId === null ? isNull(dashboardBoards.ownerId) : eq(dashboardBoards.ownerId, ownerId);
}
