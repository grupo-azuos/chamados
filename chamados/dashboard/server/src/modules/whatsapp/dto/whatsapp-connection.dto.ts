import { whatsappConnectionSchema } from '@template/shared/schemas/whatsapp-connection.schema';
import { createZodDto } from '../../../lib/http/zod-dto';

export class WhatsappConnectionDto extends createZodDto(whatsappConnectionSchema) {}
