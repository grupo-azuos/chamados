import { Module } from '@nestjs/common';

import { AuthModule } from '../../lib/auth/auth.module';
import { DepartmentsModule } from '../departments/departments.module';
import { TraceabilityController } from './controller/traceability.controller';
import { TraceabilityRepository } from './repository/traceability.repository';
import { TraceabilityService } from './service/traceability.service';

/** A rastreabilidade da Infraestrutura: o mapa de usuário, computador e departamento. */
@Module({
  imports: [AuthModule, DepartmentsModule],
  controllers: [TraceabilityController],
  providers: [TraceabilityRepository, TraceabilityService],
})
export class TraceabilityModule {}
