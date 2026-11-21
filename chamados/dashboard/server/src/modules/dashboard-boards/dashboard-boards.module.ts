import { Global, Module } from '@nestjs/common';

import { BOARD_DRILL } from './board-drill.token';
import { DashboardBoardsController } from './controller/dashboard-boards.controller';
import { DashboardBoardsRepository } from './repository/dashboard-boards.repository';
import { DashboardBoardsService } from './service/dashboard-boards.service';

/**
 * O índice da pasta: é o único arquivo fora das subpastas, e aponta para todo o resto.
 * Módulo novo precisa ser registrado em `app.module.ts`.
 *
 * Global por causa do recorte (`BOARD_DRILL`): as telas de destino de um clique no painel —
 * chamados, máquinas, manutenções, sistemas, estoque — pedem a condição do bloco sem importar
 * este módulo (o que fecharia um ciclo).
 */
@Global()
@Module({
  controllers: [DashboardBoardsController],
  providers: [
    DashboardBoardsService,
    DashboardBoardsRepository,
    { provide: BOARD_DRILL, useExisting: DashboardBoardsService },
  ],
  exports: [BOARD_DRILL],
})
export class DashboardBoardsModule {}
