import { whatsappConnectionSchema } from '@template/shared/schemas/whatsapp-connection.schema';
import { createZodDto } from 'nestjs-zod';

export class WhatsappConnectionDto extends createZodDto(whatsappConnectionSchema) {}
