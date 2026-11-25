import { Inject, Injectable } from '@nestjs/common';
import { type DisposalReason } from '@template/shared/domain/inventory-stock.util';
import {
  balanceAfterTicketItem,
  type TicketStockDirection,
  type TicketStockSource,
} from '@template/shared/domain/ticket-stock.util';
import { and, asc, desc, eq, inArray, isNotNull, isNull, sum } from 'drizzle-orm';

import { DB } from '../../../lib/db/db.token';
import { type Database, type DatabaseExecutor } from '../../../lib/db/db.type';
import { archiveValues } from '../../../lib/db/archive.util';
import { runMaybe, runQuery } from '../../../lib/db/db-error.util';
import { inventoryItems } from '../../../lib/db/schema/inventory-items.schema';
import { inventoryMovements } from '../../../lib/db/schema/inventory-movements.schema';
import { partMovements } from '../../../lib/db/schema/part-movements.schema';
import { parts } from '../../../lib/db/schema/parts.schema';
import {
  type TicketStockItemInsert,
  type TicketStockItemRow,
  ticketStockItems,
} from '../../../lib/db/schema/ticket-stock-items.schema';

/** O item da prateleira como o chamado precisa dele: nome e saldo. */
export type ShelfItem = { id: number; name: string; balance: number };

/** O movimento que um item do chamado vira no depósito. */
export type ShelfMove = {
  source: TicketStockSource;
  itemId: number;
  direction: TicketStockDirection;
  quantity: number;
  /** O motivo, quando o item vai para o descarte. */
  reason?: DisposalReason | null;
  /** O que o extrato do depósito diz sobre a linha — "Chamado CH-0049". */
  note: string;
  computerId: number | null;
  /** O chamado que gera o movimento — o Depósito leva até ele e não o apaga por fora. */
  ticketId: number;
  createdBy: string;
};

/**
 * Os ITENS DE ESTOQUE dos chamados (ver `ticket-stock-items.schema`). Só lê e grava: o que cabe,
 * quem pode e quando o saldo anda são regras do service.
 *
 * Também escreve nos DEPÓSITOS (peças e produtos), e de propósito: o item do chamado e o
 * movimento que ele vira precisam entrar na mesma transação. Gravar o movimento por fora
 * deixaria, numa falha no meio, o saldo andado e o item ainda "reservado" — e ele andaria de
 * novo no próximo encerramento.
 */
@Injectable()
export class TicketStockItemsRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  async listByTicket(
    ticketId: number,
    executor: DatabaseExecutor = this.db,
  ): Promise<TicketStockItemRow[]> {
    return runQuery(
      executor
        .select()
        .from(ticketStockItems)
        .where(and(eq(ticketStockItems.ticketId, ticketId), isNull(ticketStockItems.archivedAt)))
        .orderBy(asc(ticketStockItems.createdAt), asc(ticketStockItems.id)),
      'listar os itens de estoque do chamado',
    );
  }

  async findById(id: number): Promise<TicketStockItemRow | null> {
    return runMaybe(
      this.db.select().from(ticketStockItems).where(eq(ticketStockItems.id, id)).limit(1),
      'buscar o item de estoque do chamado',
    );
  }

  async insert(values: TicketStockItemInsert): Promise<TicketStockItemRow> {
    const [row] = await runQuery(
      this.db.insert(ticketStockItems).values(values).returning(),
      'vincular o item de estoque ao chamado',
    );
    if (!row) throw new Error('insert returned no ticket stock item row');

    return row;
  }

  /** Tira o item do chamado: ARQUIVA a linha, com quem tirou. */
  async archive(
    id: number,
    actorId: string | null,
    executor: DatabaseExecutor = this.db,
  ): Promise<void> {
    await runQuery(
      executor
        .update(ticketStockItems)
        .set(archiveValues(true, actorId))
        .where(eq(ticketStockItems.id, id)),
      'tirar o item de estoque do chamado',
    );
  }

  /** Os itens tirados do chamado — o bloco "Removidos". */
  async listArchived(ticketId: number): Promise<TicketStockItemRow[]> {
    return runQuery(
      this.db
        .select()
        .from(ticketStockItems)
        .where(and(eq(ticketStockItems.ticketId, ticketId), isNotNull(ticketStockItems.archivedAt)))
        .orderBy(desc(ticketStockItems.archivedAt)),
      'listar os itens tirados do chamado',
    );
  }

  /**
   * Devolve o item tirado como RESERVA de novo (`settled_at` nulo): se ele já tinha virado
   * movimento, o "tirar" desfez o movimento no depósito, e o próximo encerramento o refaz.
   */
  async restore(id: number): Promise<void> {
    await runQuery(
      this.db
        .update(ticketStockItems)
        .set({ ...archiveValues(false, null), settledAt: null })
        .where(eq(ticketStockItems.id, id)),
      'devolver o item de estoque ao chamado',
    );
  }

  async markSettled(ids: readonly number[], at: Date, executor: DatabaseExecutor): Promise<void> {
    if (ids.length === 0) return;

    await runQuery(
      executor
        .update(ticketStockItems)
        .set({ settledAt: at })
        .where(inArray(ticketStockItems.id, [...ids])),
      'marcar os itens do chamado como movidos no depósito',
    );
  }

  /** O item da prateleira, travado para a conta do saldo não correr com outra ao mesmo tempo. */
  async findShelfItemForUpdate(
    source: TicketStockSource,
    itemId: number,
    executor: DatabaseExecutor,
  ): Promise<ShelfItem | null> {
    const table = source === 'parts' ? parts : inventoryItems;

    return runMaybe(
      executor
        .select({ id: table.id, name: table.name, balance: table.balance })
        .from(table)
        .where(eq(table.id, itemId))
        .limit(1)
        .for('update'),
      'buscar o item do depósito',
    );
  }

  async findShelfItem(source: TicketStockSource, itemId: number): Promise<ShelfItem | null> {
    const table = source === 'parts' ? parts : inventoryItems;

    return runMaybe(
      this.db
        .select({ id: table.id, name: table.name, balance: table.balance })
        .from(table)
        .where(and(eq(table.id, itemId), activeShelfItem(source)))
        .limit(1),
      'buscar o item do depósito',
    );
  }

  /** Todos os itens da prateleira, por nome — as opções do campo de escolha. */
  async listShelf(source: TicketStockSource): Promise<ShelfItem[]> {
    const table = source === 'parts' ? parts : inventoryItems;

    return runQuery(
      this.db
        .select({ id: table.id, name: table.name, balance: table.balance })
        .from(table)
        .where(activeShelfItem(source))
        .orderBy(asc(table.name), asc(table.id)),
      'listar os itens do depósito',
    );
  }

  /**
   * Quanto de cada item está RESERVADO para sair por chamados abertos — itens de saída ainda
   * não movidos.
   */
  async reservedOut(source: TicketStockSource): Promise<Map<number, number>> {
    const column = source === 'parts' ? ticketStockItems.partId : ticketStockItems.inventoryItemId;
    const rows = await runQuery(
      this.db
        .select({ itemId: column, total: sum(ticketStockItems.quantity) })
        .from(ticketStockItems)
        .where(
          and(
            isNotNull(column),
            isNull(ticketStockItems.settledAt),
            isNull(ticketStockItems.archivedAt),
            /* O descarte também tira da prateleira: reserva como a saída. */
            inArray(ticketStockItems.direction, ['out', 'disposal']),
          ),
        )
        .groupBy(column),
      'somar o que os chamados reservaram no depósito',
    );

    return new Map(
      rows
        .filter((row): row is { itemId: number; total: string | null } => row.itemId !== null)
        .map((row) => [row.itemId, Number(row.total ?? 0)]),
    );
  }

  /**
   * Grava o MOVIMENTO no depósito e o saldo novo — o mesmo par que a tela do Depósito grava,
   * pelo mesmo extrato. Chamada dentro da transação de quem encerra ou desfaz.
   */
  async moveShelf(item: ShelfItem, move: ShelfMove, executor: DatabaseExecutor): Promise<void> {
    const balance = balanceAfterTicketItem(item.balance, move.direction, move.quantity);

    if (move.source === 'parts') {
      await runQuery(
        executor.insert(partMovements).values({
          partId: item.id,
          type: move.direction,
          reason: move.direction === 'disposal' ? (move.reason ?? 'other') : null,
          quantity: move.quantity,
          balanceAfter: balance,
          computerId: move.computerId,
          ticketId: move.ticketId,
          note: move.note,
          createdBy: move.createdBy,
        }),
        'registrar o movimento da peça',
      );
      await runQuery(
        executor
          .update(parts)
          .set({ balance, updatedAt: new Date(), updatedBy: move.createdBy })
          .where(eq(parts.id, item.id)),
        'atualizar o saldo da peça',
      );
      return;
    }

    await runQuery(
      executor.insert(inventoryMovements).values({
        itemId: item.id,
        type: move.direction,
        reason: move.direction === 'disposal' ? (move.reason ?? 'other') : null,
        quantity: move.quantity,
        balanceAfter: balance,
        note: move.note,
        createdBy: move.createdBy,
      }),
      'registrar o movimento do produto',
    );
    await runQuery(
      executor.update(inventoryItems).set({ balance }).where(eq(inventoryItems.id, item.id)),
      'atualizar o saldo do produto',
    );
  }

  async transaction<T>(run: (executor: DatabaseExecutor) => Promise<T>): Promise<T> {
    return this.db.transaction(async (tx) => run(tx));
  }
}

/** O produto excluído (arquivado) do inventário não se vincula a chamado novo. As peças da TI
 *  não se excluem: a prateleira delas não tem filtro. */
function activeShelfItem(source: TicketStockSource) {
  return source === 'inventory' ? isNull(inventoryItems.archivedAt) : undefined;
}
