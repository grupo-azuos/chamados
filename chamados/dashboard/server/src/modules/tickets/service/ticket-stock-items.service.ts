import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ticketAreaLabel } from '@template/shared/domain/ticket-catalog.util';
import { formatTicketProtocol } from '@template/shared/domain/ticket-protocol.util';
import { isClosedTicketStatus } from '@template/shared/domain/ticket-status.util';
import {
  availableForTicket,
  refuseTicketStockItem,
  refuseTicketStockSettlement,
  reverseTicketStockDirection,
  ticketStockDirectionLabel,
  ticketStockSourceArea,
  type TicketStockSource,
} from '@template/shared/domain/ticket-stock.util';
import {
  type CreateTicketStockItemInput,
  createTicketStockItemSchema,
  type TicketStockItem,
  type TicketStockOption,
} from '@template/shared/schemas/ticket-stock-item.schema';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { type DatabaseExecutor } from '../../../lib/db/db.type';
import { type TicketRow } from '../../../lib/db/schema/tickets.schema';
import { type TicketStockItemRow } from '../../../lib/db/schema/ticket-stock-items.schema';
import { assertCanAttendTicket, assertCanRead } from '../../../lib/policy/policy-assert.util';
import { toUpdateHistory } from '../mapper/ticket-histories.mapper';
import { sourceOf, toTicketStockItem } from '../mapper/ticket-stock-items.mapper';
import { TicketHistoriesRepository } from '../repository/ticket-histories.repository';
import { TicketStockItemsRepository } from '../repository/ticket-stock-items.repository';
import { TicketAccessService, type TicketInReach } from './ticket-access.service';

export const TICKET_STOCK_ITEM_NOT_FOUND = 'Este item não está mais no chamado.';
export const SHELF_ITEM_NOT_FOUND = 'Este item não existe mais no depósito.';
export const CLOSED_TICKET_STOCK =
  'O chamado está encerrado. Reabra o chamado para tirar ou colocar itens do estoque.';

/** Quem lança o item — o nome vai para a ficha e a ordem de serviço, o e-mail para o extrato. */
type StockAuthor = { name: string; email: string };

/**
 * OS ITENS DE ESTOQUE de um chamado (ver `ticket-stock.util`).
 *
 * O ciclo de um item:
 * 1. **Vinculado** com o chamado aberto — fica RESERVADO, o saldo não anda. A saída só cabe no
 *    que sobra depois das reservas dos outros chamados.
 * 2. **Encerrar o chamado** transforma cada item reservado num movimento do depósito (`settle`,
 *    chamado pela linha do tempo, dentro da mesma transação do histórico que encerra).
 * 3. **Chamado encerrado não muda de item.** Para tirar ou colocar, reabre-se o chamado. Tirar um
 *    item que já virou movimento DESFAZ o movimento — a saída volta para a prateleira.
 *
 * Cada mudança entra na linha do tempo como "Alteração de dados", como as outras correções.
 */
@Injectable()
export class TicketStockItemsService {
  constructor(
    private readonly repository: TicketStockItemsRepository,
    private readonly access: TicketAccessService,
    private readonly histories: TicketHistoriesRepository,
  ) {}

  /** Os itens do chamado, das duas prateleiras — cada tela mostra a da própria área. */
  async list(user: RequestUser, ticketId: number): Promise<TicketStockItem[]> {
    assertCanRead(user.role, 'os chamados');
    await this.access.reach(user, ticketId);

    const rows = await this.repository.listByTicket(ticketId);

    return rows.map(toTicketStockItem);
  }

  /**
   * O que pode ser vinculado: todo item da prateleira, com quanto ainda sobra para SAIR. A
   * tela mostra a sobra ao lado do nome e esconde da saída o que está zerado.
   */
  async options(user: RequestUser, source: TicketStockSource): Promise<TicketStockOption[]> {
    assertCanRead(user.role, 'o depósito');

    const [shelf, reserved] = await Promise.all([
      this.repository.listShelf(source),
      this.repository.reservedOut(source),
    ]);

    return shelf.map((item) => ({
      id: item.id,
      name: item.name,
      available: availableForTicket(item.balance, reserved.get(item.id) ?? 0),
    }));
  }

  async add(
    user: RequestUser,
    ticketId: number,
    input: CreateTicketStockItemInput,
  ): Promise<TicketStockItem> {
    assertCanAttendTicket(user.role);
    const { source, itemId, direction, quantity } = createTicketStockItemSchema.parse(input);

    const reach = await this.access.reach(user, ticketId);
    this.assertCanUseShelf(reach, source);
    assertOpen(reach.ticket);

    const item = await this.repository.findShelfItem(source, itemId);
    if (!item) throw new NotFoundException(SHELF_ITEM_NOT_FOUND);

    const reserved = await this.repository.reservedOut(source);
    const available = availableForTicket(item.balance, reserved.get(item.id) ?? 0);
    const refusal = refuseTicketStockItem({ name: item.name, direction, quantity, available });
    if (refusal) throw new UnprocessableEntityException(refusal);

    const row = await this.repository.insert({
      ticketId,
      partId: source === 'parts' ? item.id : null,
      inventoryItemId: source === 'inventory' ? item.id : null,
      itemName: item.name,
      direction,
      quantity,
      createdBy: user.email,
      createdByName: user.name,
    });

    await this.histories.record(
      toUpdateHistory(reach.ticket, `Item do estoque: ${describe(row)}.`, user),
    );

    return toTicketStockItem(row);
  }

  /**
   * Tira o item do chamado. Item ainda reservado só sai da lista. Item que já virou movimento
   * (chamado encerrado e reaberto) desfaz o movimento no depósito — e a entrada que já foi
   * consumida não pode ser desfeita: o saldo ficaria negativo.
   */
  async remove(user: RequestUser, ticketId: number, id: number): Promise<void> {
    assertCanAttendTicket(user.role);

    const reach = await this.access.reach(user, ticketId);
    const row = await this.repository.findById(id);
    if (!row || row.ticketId !== ticketId) throw new NotFoundException(TICKET_STOCK_ITEM_NOT_FOUND);

    this.assertCanUseShelf(reach, sourceOf(row));
    assertOpen(reach.ticket);

    await this.repository.transaction(async (executor) => {
      if (row.settledAt) await this.undoMove(row, reach.ticket, user.email, executor);
      await this.repository.delete(row.id, executor);
    });

    await this.histories.record(
      toUpdateHistory(reach.ticket, `Tirou o item do estoque: ${describe(row)}.`, user),
    );
  }

  /**
   * O ENCERRAMENTO: cada item reservado vira um movimento do depósito, e passa a constar como
   * movido. Roda dentro da transação do histórico que encerra — se um item não couber na
   * prateleira, o encerramento inteiro é recusado com o motivo.
   */
  async settle(ticket: TicketRow, author: StockAuthor, executor: DatabaseExecutor): Promise<void> {
    const pending = (await this.repository.listByTicket(ticket.id, executor)).filter(
      (row) => row.settledAt === null,
    );
    if (pending.length === 0) return;

    for (const row of pending) {
      const source = sourceOf(row);
      const itemId = shelfIdOf(row);
      const item = await this.repository.findShelfItemForUpdate(source, itemId, executor);
      if (!item) throw new UnprocessableEntityException(`${row.itemName}: ${SHELF_ITEM_NOT_FOUND}`);

      const refusal = refuseTicketStockSettlement({
        name: item.name,
        direction: row.direction,
        quantity: row.quantity,
        balance: item.balance,
      });
      if (refusal) throw new UnprocessableEntityException(refusal);

      await this.repository.moveShelf(
        item,
        {
          source,
          itemId,
          direction: row.direction,
          quantity: row.quantity,
          note: `Chamado ${formatTicketProtocol(ticket.id)}`,
          computerId: ticket.computerId,
          createdBy: author.email,
        },
        executor,
      );
    }

    await this.repository.markSettled(
      pending.map((row) => row.id),
      new Date(),
      executor,
    );
  }

  /** Os itens do chamado para a ordem de serviço — sem policy: quem emite já passou por ela. */
  async listForServiceOrder(ticketId: number): Promise<TicketStockItem[]> {
    const rows = await this.repository.listByTicket(ticketId);

    return rows.map(toTicketStockItem);
  }

  private async undoMove(
    row: TicketStockItemRow,
    ticket: TicketRow,
    email: string,
    executor: DatabaseExecutor,
  ): Promise<void> {
    const source = sourceOf(row);
    const itemId = shelfIdOf(row);
    const item = await this.repository.findShelfItemForUpdate(source, itemId, executor);
    if (!item) throw new UnprocessableEntityException(SHELF_ITEM_NOT_FOUND);

    const direction = reverseTicketStockDirection(row.direction);
    if (direction === 'out' && item.balance < row.quantity) {
      throw new UnprocessableEntityException(
        `O depósito tem ${item.balance} de ${item.name}, e desfazer esta entrada tira ${row.quantity}. Registre o que falta no depósito antes.`,
      );
    }

    await this.repository.moveShelf(
      item,
      {
        source,
        itemId,
        direction,
        quantity: row.quantity,
        note: `Desfeito no chamado ${formatTicketProtocol(ticket.id)}`,
        computerId: ticket.computerId,
        createdBy: email,
      },
      executor,
    );
  }

  /**
   * Mexer na prateleira de uma área pede DUAS coisas: o chamado ser daquela área (original ou
   * participante) e quem pede administrar aquela área. Quem atende só Infra não tira produto
   * do Depósito da Manutenção por um chamado que também é de Manutenção.
   */
  private assertCanUseShelf(reach: TicketInReach, source: TicketStockSource): void {
    const area = ticketStockSourceArea(source);
    const ticketAreas = [reach.ticket.area, ...reach.participantAreas];

    if (!ticketAreas.includes(area)) {
      throw new UnprocessableEntityException(
        `Este chamado não é de ${ticketAreaLabel(area)}. Some a área ao chamado antes de usar o depósito dela.`,
      );
    }

    if (reach.access[area] === 'admin') return;

    throw new ForbiddenException(
      `Só quem administra ${ticketAreaLabel(area)} mexe no depósito dessa área.`,
    );
  }
}

function assertOpen(ticket: TicketRow): void {
  if (isClosedTicketStatus(ticket.status)) throw new UnprocessableEntityException(CLOSED_TICKET_STOCK);
}

function shelfIdOf(row: TicketStockItemRow): number {
  return row.partId ?? row.inventoryItemId ?? 0;
}

/** "saída de 2 × Mouse USB" — o que a linha do tempo conta. */
function describe(row: TicketStockItemRow): string {
  return `${ticketStockDirectionLabel(row.direction).toLowerCase()} de ${row.quantity} × ${row.itemName}`;
}
