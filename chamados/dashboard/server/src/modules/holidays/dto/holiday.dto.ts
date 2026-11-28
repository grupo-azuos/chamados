import { holidayListQuerySchema, holidayListSchema } from '@template/shared/schemas/holiday.schema';

import { createZodDto } from '../../../lib/http/zod-dto';

/** Nascem dos mesmos schemas Zod que a web importa: o contrato é um só. */
export class HolidayListQueryDto extends createZodDto(holidayListQuerySchema) {}
export class HolidayListDto extends createZodDto(holidayListSchema) {}
