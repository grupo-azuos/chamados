import {
  updateWhatsappTemplateSchema,
  whatsappTemplateSchema,
} from '@template/shared/schemas/whatsapp-template.schema';
import { createZodDto } from 'nestjs-zod';

export class WhatsappTemplateDto extends createZodDto(whatsappTemplateSchema) {}

export class UpdateWhatsappTemplateDto extends createZodDto(updateWhatsappTemplateSchema) {}
