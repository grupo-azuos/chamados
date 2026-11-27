import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { AuthModule } from '../../lib/auth/auth.module';
import { HistoryController } from './controller/history.controller';
import { HistoryInterceptor } from './interceptor/history.interceptor';
import { HistoryRepository } from './repository/history.repository';
import { HistoryReadService } from './service/history-read.service';
import { HistoryService } from './service/history.service';

/**
 * O histórico do sistema (ver `history.schema`). O interceptor é global: registra toda mudança
 * feita pela API. O `HistoryService` é exportado para o que muda dado fora de uma requisição
 * de pessoa — como o chamado que o bot do WhatsApp abre. A leitura (a tela Histórico de cada
 * módulo) é o `HistoryReadService`, com o diretório de pessoas do `AuthModule` para dar nome a
 * quem fez.
 */
@Module({
  imports: [AuthModule],
  controllers: [HistoryController],
  providers: [
    HistoryRepository,
    HistoryService,
    HistoryReadService,
    { provide: APP_INTERCEPTOR, useClass: HistoryInterceptor },
  ],
  exports: [HistoryService],
})
export class HistoryModule {}
