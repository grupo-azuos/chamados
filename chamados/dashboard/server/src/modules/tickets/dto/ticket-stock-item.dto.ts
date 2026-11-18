import {
  createTicketStockItemSchema,
  ticketStockItemSchema,
  ticketStockOptionSchema,
  ticketStockOptionsQuerySchema,
} from '@template/shared/schemas/ticket-stock-item.schema';

import { createZodDto } from '../../../lib/http/zod-dto';

/** Os DTOs nascem dos MESMOS schemas Zod que a web importa (ver `ticket.dto.ts`). */
export class TicketStockItemDto extends createZodDto(ticketStockItemSchema) {}
export class CreateTicketStockItemDto extends createZodDto(createTicketStockItemSchema) {}
export class TicketStockOptionDto extends createZodDto(ticketStockOptionSchema) {}
export class TicketStockOptionsQueryDto extends createZodDto(ticketStockOptionsQuerySchema) {}
