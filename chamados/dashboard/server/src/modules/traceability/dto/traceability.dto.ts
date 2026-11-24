import {
  traceabilityGraphSchema,
  traceabilityPersonSchema,
  traceabilityQuerySchema,
} from '@template/shared/schemas/traceability.schema';

import { createZodDto } from '../../../lib/http/zod-dto';

/** Os DTOs nascem dos MESMOS schemas Zod que a web importa. */
export class TraceabilityQueryDto extends createZodDto(traceabilityQuerySchema) {}
export class TraceabilityGraphDto extends createZodDto(traceabilityGraphSchema) {}
export class TraceabilityPersonDto extends createZodDto(traceabilityPersonSchema) {}
