import { Module } from '@nestjs/common';

import { DashboardBoardsController } from './controller/dashboard-boards.controller';
import { DashboardBoardsRepository } from './repository/dashboard-boards.repository';
import { DashboardBoardsService } from './service/dashboard-boards.service';

/**
 * O índice da pasta: é o único arquivo fora das subpastas, e aponta para todo o resto.
 * Módulo novo precisa ser registrado em `app.module.ts`.
 */
@Module({
  controllers: [DashboardBoardsController],
  providers: [DashboardBoardsService, DashboardBoardsRepository],
})
export class DashboardBoardsModule {}
