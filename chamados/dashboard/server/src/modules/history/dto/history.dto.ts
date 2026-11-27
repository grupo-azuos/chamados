import { historyPageSchema, historyQuerySchema } from '@template/shared/schemas/history.schema';

import { createZodDto } from '../../../lib/http/zod-dto';

/** Os DTOs nascem dos MESMOS schemas Zod que a web importa — ver `budget.dto.ts`. */
export class HistoryQueryDto extends createZodDto(historyQuerySchema) {}
export class HistoryPageDto extends createZodDto(historyPageSchema) {}
