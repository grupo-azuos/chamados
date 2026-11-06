import { insightQuerySchema, insightsSchema } from '@template/shared/schemas/insight.schema';
import { createZodDto } from '../../../lib/http/zod-dto';

/**
 * Os DTOs nascem dos MESMOS schemas Zod que a web importa — é o que garante que a validação
 * em runtime e o contrato publicado no Swagger não possam divergir.
 */
export class InsightQueryDto extends createZodDto(insightQuerySchema) {}
export class InsightsDto extends createZodDto(insightsSchema) {}
