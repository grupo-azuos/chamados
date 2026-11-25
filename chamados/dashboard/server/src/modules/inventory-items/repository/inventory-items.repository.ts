import { Inject, Injectable } from '@nestjs/common';
import { type InventoryItemListQuery } from '@template/shared/schemas/inventory-item.schema';
import { type InventoryMovementListQuery } from '@template/shared/schemas/inventory-movement.schema';
import { type TicketStockLink } from '@template/shared/schemas/ticket-stock-item.schema';
import { and, asc, count, desc, eq, ilike, isNull, or, sql, type SQL } from 'drizzle-orm';

import { archivedCondition, archiveValues } from '../../../lib/db/archive.util';
import { runMaybe, runQuery } from '../../../lib/db/db-error.util';
import { DB } from '../../../lib/db/db.token';
import { ticketStockLinksOf } from '../../../lib/db/ticket-stock-link.util';
import { type Database, type DatabaseExecutor } from '../../../lib/db/db.type';
import {
  inventoryItems,
  type InventoryItemInsert,
  type InventoryItemRow,
} from '../../../lib/db/schema/inventory-items.schema';
import {
  inventoryMovements,
  type InventoryMovementInsert,
  type InventoryMovementRow,
} from '../../../lib/db/schema/inventory-movements.schema';

export type InventoryItemPage = { rows: InventoryItemRow[]; total: number };

export type InventoryMovementPage = {
  rows: {
    movement: InventoryMovementRow;
    item: { name: string; unit: InventoryItemRow['unit'] };
  }[];
  total: number;
};

const movementItemColumns = { name: inventoryItems.name, unit: inventoryItems.unit };

/**
 * O repository não tem regra: traduz filtro em consulta e devolve linha. Quem pode o quê, o
 * que carimbar, o que fazer com a foto e se a saída cabe no estoque vive no service.
 *
 * Os métodos de escrita do DEPÓSITO recebem um `DatabaseExecutor`: é o que permite ao service
 * chamá-los dentro de uma transação. O movimento e o saldo do produto precisam entrar juntos
 * ou não entrar — gravar um sem o outro deixaria a prateleira discordando do próprio extrato.
 */
@Injectable()
export class InventoryItemsRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  /** `drill`: o recorte de um clique no painel, já em SQL — mais uma condição E do filtro. */
  async list(query: InventoryItemListQuery, drill?: SQL): Promise<InventoryItemPage> {
    const where = and(buildWhere(query), drill);
    const offset = (query.page - 1) * query.pageSize;

    const [rows, [counted]] = await Promise.all([
      runQuery(
        this.db
          .select()
          .from(inventoryItems)
          .where(where)
          /* Ordenado por departamento e depois pelo número do patrimônio */
          .orderBy(
            sql`coalesce(${inventoryItems.department}, '') asc`,
            sql`nullif(regexp_replace(${inventoryItems.code}, '\\D', '', 'g'), '')::bigint asc nulls last`,
            asc(inventoryItems.code),
            asc(inventoryItems.name),
          )
          .limit(query.pageSize)
          .offset(offset),
        'listar produtos do inventário',
      ),
      runQuery(
        this.db.select({ total: count() }).from(inventoryItems).where(where),
        'contar produtos do inventário',
      ),
    ]);

    return { rows, total: counted?.total ?? rows.length };
  }

  async findById(id: number): Promise<InventoryItemRow | null> {
    return runMaybe(
      this.db.select().from(inventoryItems).where(eq(inventoryItems.id, id)).limit(1),
      'ler produto do inventário',
    );
  }

  async insert(values: InventoryItemInsert): Promise<InventoryItemRow> {
    const [row] = await runQuery(
      this.db.insert(inventoryItems).values(values).returning(),
      'cadastrar produto do inventário',
    );

    /* O `returning` sempre devolve a linha inserida; o tipo é que não sabe disso. */
    return row as InventoryItemRow;
  }

  async update(id: number, values: Partial<InventoryItemInsert>): Promise<InventoryItemRow | null> {
    const [row] = await runQuery(
      this.db.update(inventoryItems).set(values).where(eq(inventoryItems.id, id)).returning(),
      'alterar produto do inventário',
    );

    return row ?? null;
  }

  /** Arquiva (excluir) ou desarquiva (desfazer). O produto, o extrato e a foto ficam. */
  async setArchived(id: number, archived: boolean, actorId: string | null): Promise<void> {
    await runQuery(
      this.db
        .update(inventoryItems)
        .set(archiveValues(archived, actorId))
        .where(eq(inventoryItems.id, id)),
      archived ? 'arquivar produto do inventário' : 'desarquivar produto do inventário',
    );
  }

  /**
   * O produto, TRAVADO até o fim da transação.
   *
   * Sem o `for update`, duas saídas simultâneas leriam o mesmo saldo 1, as duas passariam na
   * conferência e o estoque terminaria em -1. Com a trava, a segunda espera a primeira
   * terminar e lê o saldo já atualizado.
   */
  async findByIdForUpdate(
    id: number,
    executor: DatabaseExecutor,
  ): Promise<InventoryItemRow | null> {
    return runMaybe(
      executor
        .select()
        .from(inventoryItems)
        .where(eq(inventoryItems.id, id))
        .limit(1)
        .for('update'),
      'ler produto para movimentar',
    );
  }

  /**
   * Os produtos de um NOME (sem diferença de maiúscula), travados para movimentar o depósito —
   * do que tem mais saldo para o que tem menos: a entrada vai para o primeiro, a saída tira dele
   * primeiro. Arquivado não entra.
   */
  async findByNameForUpdate(name: string, executor: DatabaseExecutor): Promise<InventoryItemRow[]> {
    return runQuery(
      executor
        .select()
        .from(inventoryItems)
        .where(and(sameName(name), isNull(inventoryItems.archivedAt)))
        .orderBy(desc(inventoryItems.balance), asc(inventoryItems.id))
        .for('update'),
      'ler produtos para movimentar',
    );
  }

  /** Os nomes de todos os produtos que não foram arquivados — a lista do campo "Nome do produto". */
  async names(): Promise<string[]> {
    const rows = await runQuery(
      this.db
        .select({ name: inventoryItems.name })
        .from(inventoryItems)
        .where(isNull(inventoryItems.archivedAt))
        .orderBy(asc(inventoryItems.id)),
      'listar nomes de produtos',
    );

    return rows.map((row) => row.name);
  }

  async updateBalance(id: number, balance: number, executor: DatabaseExecutor): Promise<void> {
    await runQuery(
      executor.update(inventoryItems).set({ balance }).where(eq(inventoryItems.id, id)),
      'salvar o saldo do produto',
    );
  }

  async insertMovement(
    values: InventoryMovementInsert,
    executor: DatabaseExecutor,
  ): Promise<InventoryMovementRow> {
    const [row] = await runQuery(
      executor.insert(inventoryMovements).values(values).returning(),
      'registrar movimento do depósito',
    );

    return row as InventoryMovementRow;
  }

  async listMovements(query: InventoryMovementListQuery): Promise<InventoryMovementPage> {
    const where = buildMovementWhere(query);
    const offset = (query.page - 1) * query.pageSize;

    const [rows, [counted]] = await Promise.all([
      runQuery(
        this.db
          .select({ movement: inventoryMovements, item: movementItemColumns })
          .from(inventoryMovements)
          .innerJoin(inventoryItems, eq(inventoryMovements.itemId, inventoryItems.id))
          .where(where)
          .orderBy(desc(inventoryMovements.createdAt), desc(inventoryMovements.id))
          .limit(query.pageSize)
          .offset(offset),
        'listar movimentos do depósito',
      ),
      runQuery(
        this.db.select({ total: count() }).from(inventoryMovements).where(where),
        'contar movimentos do depósito',
      ),
    ]);

    return { rows, total: counted?.total ?? rows.length };
  }

  /** Abre a transação. Movimento e saldo entram juntos, ou não entram. */
  /** Os chamados abertos que prendem estes itens — o selo "no chamado CH-…" da tela. */
  async ticketLinksOf(ids: readonly number[]): Promise<Map<number, TicketStockLink[]>> {
    return ticketStockLinksOf(this.db, 'inventory', ids);
  }

  async transaction<T>(run: (executor: DatabaseExecutor) => Promise<T>): Promise<T> {
    return this.db.transaction(async (tx) => run(tx));
  }
}

function buildMovementWhere(query: InventoryMovementListQuery): SQL | undefined {
  const filters: SQL[] = [];

  if (query.itemId) filters.push(eq(inventoryMovements.itemId, query.itemId));
  if (query.type) filters.push(eq(inventoryMovements.type, query.type));
  if (query.reason) filters.push(eq(inventoryMovements.reason, query.reason));

  return filters.length > 0 ? and(...filters) : undefined;
}

/**
 * A busca procura no nome, no lugar e no código: é por um desses três que alguém procura um
 * produto — "cadeira", "sala da fiscal" ou a etiqueta que está colada nele.
 */
function buildWhere(query: InventoryItemListQuery): SQL | undefined {
  const filters: (SQL | undefined)[] = [
    archivedCondition(inventoryItems.archivedAt, query.archived),
  ];

  if (query.category) filters.push(eq(inventoryItems.category, query.category));
  if (query.withoutPhotoOnly) filters.push(isNull(inventoryItems.photoKey));
  if (query.outOfStockOnly) filters.push(eq(inventoryItems.balance, 0));

  if (query.search) {
    const term = `%${query.search}%`;
    filters.push(
      or(
        ilike(inventoryItems.name, term),
        ilike(inventoryItems.location, term),
        ilike(inventoryItems.department, term),
        ilike(inventoryItems.userName, term),
        ilike(inventoryItems.code, term),
      ),
    );
  }

  return filters.length > 0 ? and(...filters) : undefined;
}

/** Mesmo nome, sem diferença de maiúscula nem de espaço sobrando — a chave do Depósito. */
function sameName(name: string): SQL {
  return sql`lower(btrim(${inventoryItems.name})) = lower(btrim(${name}))`;
}
