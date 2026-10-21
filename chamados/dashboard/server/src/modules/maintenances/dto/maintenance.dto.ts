import {
  createMaintenanceSchema,
  maintenanceListQuerySchema,
  maintenanceScheduleListQuerySchema,
  maintenanceScheduleSchema,
  maintenanceSchema,
  preventiveDueSchema,
  saveMaintenanceScheduleSchema,
  updateMaintenanceSchema,
} from '@template/shared/schemas/maintenance.schema';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * Os DTOs nascem dos MESMOS schemas Zod que a web importa — é o que garante que a validação
 * em runtime e o contrato publicado no Swagger não possam divergir.
 */
export class MaintenanceListQueryDto extends createZodDto(maintenanceListQuerySchema) {}
export class CreateMaintenanceDto extends createZodDto(createMaintenanceSchema) {}
export class UpdateMaintenanceDto extends createZodDto(updateMaintenanceSchema) {}
export class MaintenanceDto extends createZodDto(maintenanceSchema) {}

/** A manutenção AGENDADA: um dia combinado por máquina. */
export class MaintenanceScheduleDto extends createZodDto(maintenanceScheduleSchema) {}
export class SaveMaintenanceScheduleDto extends createZodDto(saveMaintenanceScheduleSchema) {}
export class MaintenanceScheduleListQueryDto extends createZodDto(maintenanceScheduleListQuerySchema) {}

/** O cruzamento do inventário com o histórico — não é tabela, é resposta calculada. */
export class PreventiveDueDto extends createZodDto(preventiveDueSchema) {}

export class MaintenanceListResponseDto extends createZodDto(
  z.object({
    items: z.array(maintenanceSchema),
    total: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
  }),
) {}
