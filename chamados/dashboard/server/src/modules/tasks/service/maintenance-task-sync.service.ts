import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { msUntilBrasiliaTime } from '@template/shared/domain/daily-schedule.util';

import { backgroundJobsEnabled } from '../../../lib/config/background-jobs.util';
import { TasksService } from './tasks.service';

/** A hora (Brasília) da rodada diária: antes de o escritório abrir, as tarefas do dia já estão lá. */
export const MAINTENANCE_TASK_SYNC_HOUR = 6;

/**
 * A RODADA DIÁRIA das tarefas de manutenção. A preventiva vence sozinha, com o passar dos dias —
 * nenhuma tela é tocada para isso acontecer. Uma rodada ao subir o servidor e outra a cada
 * manhã abrem as tarefas do que venceu (ou vence na semana) e finalizam as que não pedem mais.
 * Registrar ou agendar manutenção também chama a rodada, para não esperar o dia seguinte.
 */
@Injectable()
export class MaintenanceTaskSyncService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MaintenanceTaskSyncService.name);
  private timer?: NodeJS.Timeout;

  constructor(private readonly tasks: TasksService) {}

  onModuleInit(): void {
    if (!backgroundJobsEnabled()) return;
    void this.run();
    this.scheduleNext();
  }

  onModuleDestroy(): void {
    clearTimeout(this.timer);
  }

  async run(now = new Date()): Promise<void> {
    try {
      const result = await this.tasks.syncMaintenance(now);
      this.logger.log(`Maintenance tasks: ${result.opened} opened, ${result.finished} finished`);
    } catch (error) {
      this.logger.error(`Maintenance task sync failed: ${String(error)}`);
    }
  }

  private scheduleNext(): void {
    this.timer = setTimeout(
      () => {
        void this.run().finally(() => this.scheduleNext());
      },
      msUntilBrasiliaTime(new Date(), MAINTENANCE_TASK_SYNC_HOUR),
    );
    /* O agendamento não pode segurar o processo vivo num desligamento. */
    this.timer.unref();
  }
}
