import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { formatTicketProtocol } from '@template/shared/domain/ticket-protocol.util';
import { type TicketRelation } from '@template/shared/schemas/ticket-relation.schema';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { assertCanRead } from '../../../lib/policy/policy-assert.util';
import { toUpdateHistory } from '../mapper/ticket-histories.mapper';
import { TicketHistoriesRepository } from '../repository/ticket-histories.repository';
import { TicketRelationsRepository } from '../repository/ticket-relations.repository';
import { TicketsRepository } from '../repository/tickets.repository';
import { TicketAccessService } from './ticket-access.service';

@Injectable()
export class TicketRelationsService {
  constructor(
    private readonly relations: TicketRelationsRepository,
    private readonly tickets: TicketsRepository,
    private readonly histories: TicketHistoriesRepository,
    private readonly access: TicketAccessService,
  ) {}

  async list(user: RequestUser, ticketId: number): Promise<TicketRelation[]> {
    assertCanRead(user.role, 'os chamados');
    await this.access.reach(user, ticketId);

    return this.relations.listByTicket(ticketId);
  }

  async add(
    user: RequestUser,
    ticketId: number,
    relatedTicketId: number,
  ): Promise<TicketRelation[]> {
    if (ticketId === relatedTicketId) {
      throw new BadRequestException('Não é possível vincular um chamado a ele mesmo.');
    }

    const reach = await this.access.reach(user, ticketId);
    this.access.assertCanWrite(reach);

    const related = await this.tickets.findById(relatedTicketId);
    if (!related) {
      throw new NotFoundException('Chamado a vincular não foi encontrado.');
    }

    await this.relations.add(ticketId, relatedTicketId, user.email);

    await this.histories.record({
      ...toUpdateHistory(
        reach.ticket,
        `Vinculou o chamado ${formatTicketProtocol(related.id)}`,
        { name: user.name, email: user.email, id: user.id },
      ),
      isVisibleToRequester: true,
    });

    return this.relations.listByTicket(ticketId);
  }

  async remove(
    user: RequestUser,
    ticketId: number,
    relatedTicketId: number,
  ): Promise<TicketRelation[]> {
    const reach = await this.access.reach(user, ticketId);
    this.access.assertCanWrite(reach);

    await this.relations.remove(ticketId, relatedTicketId);

    await this.histories.record({
      ...toUpdateHistory(
        reach.ticket,
        `Desvinculou o chamado ${formatTicketProtocol(relatedTicketId)}`,
        { name: user.name, email: user.email, id: user.id },
      ),
      isVisibleToRequester: true,
    });

    return this.relations.listByTicket(ticketId);
  }
}
