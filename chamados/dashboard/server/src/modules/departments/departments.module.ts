import { Module } from '@nestjs/common';

import { DepartmentsController } from './controller/departments.controller';
import { HrDepartmentsRepository } from './repository/hr-departments.repository';
import { DepartmentsService } from './service/departments.service';

/** Os departamentos vêm do RH; quem precisa da lista (chamados, WhatsApp) importa este módulo. */
@Module({
  controllers: [DepartmentsController],
  providers: [
    HrDepartmentsRepository,
    {
      provide: DepartmentsService,
      useFactory: (repository: HrDepartmentsRepository) => new DepartmentsService(repository),
      inject: [HrDepartmentsRepository],
    },
  ],
  exports: [DepartmentsService],
})
export class DepartmentsModule {}
