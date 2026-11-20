import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { refuseAttachmentRemoval } from '@template/shared/domain/attachment-ownership.util';
import { ticketAreaLabel, type TicketArea } from '@template/shared/domain/ticket-catalog.util';
import { formatTicketProtocol } from '@template/shared/domain/ticket-protocol.util';
import { isClosedTicketStatus } from '@template/shared/domain/ticket-status.util';
import {
  type TicketRemovedItem,
  type TicketRemovedKind,
} from '@template/shared/schemas/ticket-removed.schema';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { assertCanAttendTicket, assertCanRead } from '../../../lib/policy/policy-assert.util';
import { toUpdateHistory } from '../mapper/ticket-histories.mapper';
import { TicketAttachmentsRepository } from '../repository/ticket-attachments.repository';
import { TicketComputersRepository } from '../repository/ticket-computers.repository';
import { TicketHistoriesRepository } from '../repository/ticket-histories.repository';
import { TicketRelationsRepository } from '../repository/ticket-relations.repository';
import { TicketStockItemsRepository } from '../repository/ticket-stock-items.repository';
import { TicketWatchersRepository } from '../repository/ticket-watchers.repository';
import { TicketsRepository } from '../repository/tickets.repository';
import { TicketAccessService, type TicketInReach } from './ticket-access.service';
import { TicketStockItemsService } from './ticket-stock-items.service';

export const REMOVED_NOT_FOUND = 'Este item não está mais entre os removidos do chamado.';
export const REMOVED_BACK_ALREADY = 'Isto já voltou ao chamado por outro caminho.';

/** Uma linha arquivada antes de virar item da tela: o que a conta de "pode desfazer" precisa. */
type Removed = Omit<TicketRemovedItem, 'canRestore' | 'archivedAt'> & {
  archivedAt: Date | null;
  /** Só o anexo tem dono: o do solicitante não é do TI. */
  isRequesterFile?: boolean;
};

/**
 * O BLOCO "REMOVIDOS" DA FICHA DO CHAMADO: junta o que saiu de cada ligação (anexos, máquinas,
 * pessoas, itens do estoque, chamados relacionados e áreas) e desfaz uma delas.
 *
 * As regras de desfazer são as de tirar: quem tira é quem atende o chamado (Administrador de
 * alguma área dele), o anexo do solicitante não é do TI, e o item do estoque segue as regras do
 * depósito (no `TicketStockItemsService`). Cada desfazer vira uma linha na linha do tempo.
 */
@Injectable()
export class TicketRemovedService {
  constructor(
    private readonly access: TicketAccessService,
    private readonly tickets: TicketsRepository,
    private readonly attachments: TicketAttachmentsRepository,
    private readonly computers: TicketComputersRepository,
    private readonly watchers: TicketWatchersRepository,
    private readonly relations: TicketRelationsRepository,
    private readonly stockItems: TicketStockItemsRepository,
    private readonly stock: TicketStockItemsService,
    private readonly histories: TicketHistoriesRepository,
  ) {}

  async list(user: RequestUser, ticketId: number): Promise<TicketRemovedItem[]> {
    assertCanRead(user.role, 'os chamados');
    const reach = await this.access.reach(user, ticketId);

    const removed = (await this.collect(ticketId)).filter(
      (item): item is Removed & { archivedAt: Date } => item.archivedAt !== null,
    );
    const canWrite = canWriteIn(this.access, reach);
    const isOpen = !isClosedTicketStatus(reach.ticket.status);

    return removed
      .sort((left, right) => right.archivedAt.getTime() - left.archivedAt.getTime())
      .map((item) => ({
        kind: item.kind,
        id: item.id,
        label: item.label,
        archivedAt: item.archivedAt.toISOString(),
        canRestore: canRestore(item, canWrite, isOpen),
      }));
  }

  async restore(
    user: RequestUser,
    ticketId: number,
    kind: TicketRemovedKind,
    id: number,
  ): Promise<void> {
    assertCanAttendTicket(user.role);

    /* O item do estoque tem as regras do depósito, e o histórico é escrito lá. */
    if (kind === 'stock_item') {
      await this.stock.restore(user, ticketId, id);
      return;
    }

    const reach = await this.access.reach(user, ticketId);
    this.access.assertCanWrite(reach);

    const label = await this.restoreOne(reach, kind, id, user);
    await this.histories.record(
      toUpdateHistory(reach.ticket, `Desfez a remoção: ${label}.`, user),
    );
  }

  private async restoreOne(
    reach: TicketInReach,
    kind: Exclude<TicketRemovedKind, 'stock_item'>,
    id: number,
    user: RequestUser,
  ): Promise<string> {
    const ticketId = reach.ticket.id;
    const restorers: Record<typeof kind, () => Promise<string>> = {
      attachment: () => this.restoreAttachment(ticketId, id),
      computer: () => this.restoreComputer(ticketId, id, user.email),
      watcher: () => this.restoreWatcher(ticketId, id),
      relation: () => this.restoreRelation(ticketId, id),
      area: () => this.restoreArea(reach, id),
    };

    return restorers[kind]();
  }

  private async restoreAttachment(ticketId: number, id: number): Promise<string> {
    const row = await this.attachments.findInTicket(ticketId, id);
    if (!row?.archivedAt) throw new NotFoundException(REMOVED_NOT_FOUND);

    const refusal = refuseAttachmentRemoval(row.origin, 'support');
    if (refusal) throw new ForbiddenException(refusal);

    await this.attachments.setArchived(row.id, false, null);

    return `anexo ${row.fileName}`;
  }

  private async restoreComputer(ticketId: number, id: number, email: string): Promise<string> {
    const archived = (await this.computers.listArchived(ticketId)).find((row) => row.id === id);
    if (!archived) throw new NotFoundException(REMOVED_NOT_FOUND);

    await this.computers.restore(ticketId, id, archived.computerId, email);

    return `máquina ${archived.name}`;
  }

  private async restoreWatcher(ticketId: number, id: number): Promise<string> {
    const archived = (await this.watchers.listArchived(ticketId)).find((row) => row.id === id);
    if (!archived) throw new NotFoundException(REMOVED_NOT_FOUND);

    await this.watchers.restore(id);

    return `pessoa ${archived.userName}`;
  }

  private async restoreRelation(ticketId: number, id: number): Promise<string> {
    const row = await this.relations.findInTicket(ticketId, id);
    if (!row?.archivedAt) throw new NotFoundException(REMOVED_NOT_FOUND);
    if (await this.relations.findActivePair(row.ticketId, row.relatedTicketId)) {
      throw new ConflictException(REMOVED_BACK_ALREADY);
    }

    await this.relations.restore(id);

    return `vínculo com o chamado ${formatTicketProtocol(otherTicketOf(row, ticketId))}`;
  }

  private async restoreArea(reach: TicketInReach, id: number): Promise<string> {
    this.access.assertCanManageArea(reach, 'devolver uma área a');

    const archived = (await this.tickets.listArchivedAreas(reach.ticket.id)).find(
      (row) => row.id === id,
    );
    if (!archived) throw new NotFoundException(REMOVED_NOT_FOUND);

    await this.tickets.restoreArea(id);

    return `área ${ticketAreaLabel(archived.area as TicketArea)}`;
  }

  /** Tudo o que foi tirado do chamado, de cada ligação, já com o nome que a tela mostra. */
  private async collect(ticketId: number): Promise<Removed[]> {
    const [attachments, computers, watchers, stockItems, relations, areas] = await Promise.all([
      this.attachments.listArchived(ticketId),
      this.computers.listArchived(ticketId),
      this.watchers.listArchived(ticketId),
      this.stockItems.listArchived(ticketId),
      this.relations.listArchived(ticketId),
      this.tickets.listArchivedAreas(ticketId),
    ]);

    return [
      ...attachments.map((row) => ({
        kind: 'attachment' as const,
        id: row.id,
        label: row.fileName,
        archivedAt: row.archivedAt,
        isRequesterFile: row.origin === 'requester',
      })),
      ...computers.map((row) => ({
        kind: 'computer' as const,
        id: row.id,
        label: row.name,
        archivedAt: row.archivedAt,
      })),
      ...watchers.map((row) => ({
        kind: 'watcher' as const,
        id: row.id,
        label: row.userName,
        archivedAt: row.archivedAt,
      })),
      ...stockItems.map((row) => ({
        kind: 'stock_item' as const,
        id: row.id,
        label: `${row.quantity} × ${row.itemName}`,
        archivedAt: row.archivedAt,
      })),
      ...relations.map((row) => ({
        kind: 'relation' as const,
        id: row.id,
        label: formatTicketProtocol(otherTicketOf(row, ticketId)),
        archivedAt: row.archivedAt,
      })),
      ...areas.map((row) => ({
        kind: 'area' as const,
        id: row.id,
        label: ticketAreaLabel(row.area as TicketArea),
        archivedAt: row.archivedAt,
      })),
    ];
  }
}

/** O outro chamado do vínculo, olhando deste. */
function otherTicketOf(row: { ticketId: number; relatedTicketId: number }, ticketId: number): number {
  return row.ticketId === ticketId ? row.relatedTicketId : row.ticketId;
}

function canWriteIn(access: TicketAccessService, reach: TicketInReach): boolean {
  try {
    access.assertCanWrite(reach);
    return true;
  } catch {
    return false;
  }
}

/** O botão só aparece para quem o servidor deixaria desfazer. */
function canRestore(item: Removed, canWrite: boolean, isOpen: boolean): boolean {
  if (!canWrite) return false;
  if (item.isRequesterFile) return false;
  if (item.kind === 'stock_item') return isOpen;

  return true;
}
