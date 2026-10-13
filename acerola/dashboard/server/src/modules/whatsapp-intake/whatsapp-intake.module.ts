import { Module } from '@nestjs/common';

import { TicketsModule } from '../tickets/tickets.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { WhatsappIntakeController } from './controller/whatsapp-intake.controller';
import { WhatsappAccessRequestService } from './service/whatsapp-access-request.service';
import { WhatsappIntakeService } from './service/whatsapp-intake.service';

/**
 * Abrir chamado a partir do WhatsApp. É um módulo à parte porque junta os dois mundos — o WhatsApp e
 * os chamados — sem que um precise conhecer o outro.
 */
@Module({
  imports: [TicketsModule, WhatsappModule],
  controllers: [WhatsappIntakeController],
  providers: [WhatsappIntakeService, WhatsappAccessRequestService],
})
export class WhatsappIntakeModule {}
