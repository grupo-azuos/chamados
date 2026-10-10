import { Module } from '@nestjs/common';

import { TicketAttachmentsController } from './controller/ticket-attachments.controller';
import { TicketHistoriesController } from './controller/ticket-histories.controller';
import { TicketServiceOrdersController } from './controller/ticket-service-orders.controller';
import { TicketsController } from './controller/tickets.controller';
import { TicketServiceOrdersRepository } from './repository/ticket-service-orders.repository';
import { TicketServiceOrdersService } from './service/ticket-service-orders.service';
import { TicketAttachmentsRepository } from './repository/ticket-attachments.repository';
import { TicketHistoriesRepository } from './repository/ticket-histories.repository';
import { TicketsRepository } from './repository/tickets.repository';
import { TicketAccessService } from './service/ticket-access.service';
import { TicketAttachmentsService } from './service/ticket-attachments.service';
import { TicketHistoriesService } from './service/ticket-histories.service';
import { TicketsService } from './service/tickets.service';

import { RolesModule } from '../roles/roles.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { TicketAssigneesService } from './service/ticket-assignees.service';
import { TicketWhatsappNotifierService } from './service/ticket-whatsapp-notifier.service';
import { SoftwareProjectsModule } from '../software-projects/software-projects.module';

/**
 * O índice da pasta: é o único arquivo fora das subpastas, e aponta para todo o resto.
 * Módulo novo precisa ser registrado em `app.module.ts`.
 */
@Module({
  imports: [SoftwareProjectsModule, RolesModule, WhatsappModule],
  controllers: [
    TicketServiceOrdersController,
    TicketsController,
    TicketAttachmentsController,
    TicketHistoriesController,
  ],
  providers: [
    TicketServiceOrdersService,
    TicketServiceOrdersRepository,
    TicketsService,
    TicketsRepository,
    TicketAttachmentsService,
    TicketAttachmentsRepository,
    TicketAccessService,
    TicketHistoriesService,
    TicketHistoriesRepository,
    TicketAssigneesService,
    TicketWhatsappNotifierService,
  ],
  exports: [TicketsService, TicketAssigneesService],
})
export class TicketsModule {}
