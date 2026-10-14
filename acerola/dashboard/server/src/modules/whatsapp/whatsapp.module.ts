import { Module } from '@nestjs/common';

import { WhatsappLinkController } from './controller/whatsapp-link.controller';
import { WhatsappTemplatesController } from './controller/whatsapp-templates.controller';
import { WhatsappConnectionsRepository } from './repository/whatsapp-connections.repository';
import { WhatsappMessagesRepository } from './repository/whatsapp-messages.repository';
import { WhatsappTemplatesRepository } from './repository/whatsapp-templates.repository';
import { BotClientService } from './service/bot-client.service';
import { WhatsappLinkService } from './service/whatsapp-link.service';
import { WhatsappMessagingService } from './service/whatsapp-messaging.service';
import { WhatsappOutboxService } from './service/whatsapp-outbox.service';
import { WhatsappTemplatesService } from './service/whatsapp-templates.service';

/**
 * O WhatsApp do lado do servidor: vínculo, textos, fila de saída e envio com limite. Não
 * conhece chamado (só guarda o número dele em cada aviso) —
 * quem liga uma coisa à outra é o módulo de chamados (que usa o envio daqui) e o de conversa
 * (`whatsapp-intake`, que usa os dois).
 */
@Module({
  controllers: [WhatsappLinkController, WhatsappTemplatesController],
  providers: [
    BotClientService,
    WhatsappConnectionsRepository,
    WhatsappMessagesRepository,
    WhatsappTemplatesRepository,
    WhatsappLinkService,
    WhatsappMessagingService,
    WhatsappOutboxService,
    WhatsappTemplatesService,
  ],
  exports: [BotClientService, WhatsappMessagingService, WhatsappConnectionsRepository],
})
export class WhatsappModule {}
