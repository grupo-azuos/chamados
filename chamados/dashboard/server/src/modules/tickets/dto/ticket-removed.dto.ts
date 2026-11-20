import { ticketRemovedItemSchema } from '@template/shared/schemas/ticket-removed.schema';

import { createZodDto } from '../../../lib/http/zod-dto';

export class TicketRemovedItemDto extends createZodDto(ticketRemovedItemSchema) {}
