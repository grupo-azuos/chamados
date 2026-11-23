import { Module } from '@nestjs/common';

import { AuthModule } from '../../lib/auth/auth.module';
import { TasksController } from './controller/tasks.controller';
import { TasksRepository } from './repository/tasks.repository';
import { MaintenanceTaskSyncService } from './service/maintenance-task-sync.service';
import { TasksService } from './service/tasks.service';

/**
 * As Tarefas. Não importa chamados nem manutenções: são ELES que avisam a tarefa
 * (`syncTicketInBackground`, `syncMaintenanceInBackground`), e o caminho de mão única evita o
 * ciclo entre os módulos.
 */
@Module({
  imports: [AuthModule],
  controllers: [TasksController],
  providers: [TasksRepository, TasksService, MaintenanceTaskSyncService],
  exports: [TasksService],
})
export class TasksModule {}
