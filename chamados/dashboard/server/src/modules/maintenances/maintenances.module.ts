import { Module } from '@nestjs/common';

import { AuthModule } from '../../lib/auth/auth.module';
import { TasksModule } from '../tasks/tasks.module';
import { MaintenancesController } from './controller/maintenances.controller';
import { MaintenancesRepository } from './repository/maintenances.repository';
import { MaintenancesService } from './service/maintenances.service';

/**
 * O índice da pasta: é o único arquivo fora das subpastas, e aponta para todo o resto.
 * Módulo novo precisa ser registrado em `app.module.ts` — esquecer é o motivo nº 1 de "a
 * rota dá 404".
 *
 * O `AuthModule` traz o diretório de pessoas: é por ele que o service troca os ids de "Quem fez"
 * pelos nomes. Sem o import, a injeção opcional chegava vazia em silêncio, o nome gravado nunca
 * era reescrito, e o card continuava mostrando quem estava antes (ou quem registrou).
 */
@Module({
  imports: [AuthModule, TasksModule],
  controllers: [MaintenancesController],
  providers: [MaintenancesService, MaintenancesRepository],
  exports: [MaintenancesService],
})
export class MaintenancesModule {}
