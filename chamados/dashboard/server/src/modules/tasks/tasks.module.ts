import { Module } from '@nestjs/common';

import { AuthModule } from '../../lib/auth/auth.module';
import { TaskStagesController } from './controller/task-stages.controller';
import { TasksController } from './controller/tasks.controller';
import { TaskStagesRepository } from './repository/task-stages.repository';
import { TasksRepository } from './repository/tasks.repository';
import { MaintenanceTaskSyncService } from './service/maintenance-task-sync.service';
import { TaskStagesService } from './service/task-stages.service';
import { TasksService } from './service/tasks.service';

/**
 * As Tarefas. Não importa chamados nem manutenções: são ELES que avisam a tarefa
 * (`syncTicketInBackground`, `syncMaintenanceInBackground`), e o caminho de mão única evita o
 * ciclo entre os módulos.
 */
@Module({
  imports: [AuthModule],
  controllers: [TasksController, TaskStagesController],
  providers: [
    TasksRepository,
    TasksService,
    MaintenanceTaskSyncService,
    TaskStagesRepository,
    TaskStagesService,
  ],
  exports: [TasksService],
})
export class TasksModule {}
