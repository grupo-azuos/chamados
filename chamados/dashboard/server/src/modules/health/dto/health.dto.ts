import { healthStatusSchema } from '@template/shared/schemas/health.schema';
import { createZodDto } from '../../../lib/http/zod-dto';

/** Nasce do MESMO schema que o resto do projeto importa — um contrato, não dois. */
export class HealthStatusDto extends createZodDto(healthStatusSchema) {}
