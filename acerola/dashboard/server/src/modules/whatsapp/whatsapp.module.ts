import { Module } from '@nestjs/common';

import { WhatsappLinkController } from './controller/whatsapp-link.controller';
import { WhatsappConnectionsRepository } from './repository/whatsapp-connections.repository';
import { BotClientService } from './service/bot-client.service';
import { WhatsappLinkService } from './service/whatsapp-link.service';

@Module({
  controllers: [WhatsappLinkController],
  providers: [BotClientService, WhatsappConnectionsRepository, WhatsappLinkService],
  exports: [BotClientService],
})
export class WhatsappModule {}
