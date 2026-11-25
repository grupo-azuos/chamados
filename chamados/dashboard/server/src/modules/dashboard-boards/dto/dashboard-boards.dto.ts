import { archivedFilterSchema } from '@template/shared/schemas/archive.schema';
import {
  boardModuleSchema,
  boardSchema,
  dashboardScopeSchema,
  saveBoardSchema,
  savedFilterSchema,
  saveFilterSchema,
  widgetDataSchema,
  widgetQuerySchema,
} from '@template/shared/schemas/dashboard-board.schema';
import { z } from 'zod';

import { createZodDto } from '../../../lib/http/zod-dto';

export class BoardParamsDto extends createZodDto(
  z.object({ module: boardModuleSchema, scope: dashboardScopeSchema }),
) {}
export class ModuleParamsDto extends createZodDto(z.object({ module: boardModuleSchema })) {}
export class FilterParamsDto extends createZodDto(
  z.object({ module: boardModuleSchema, id: z.uuid() }),
) {}
export class SaveBoardDto extends createZodDto(saveBoardSchema) {}
export class BoardDto extends createZodDto(boardSchema) {}
export class WidgetQueryDto extends createZodDto(widgetQuerySchema) {}
export class WidgetDataDto extends createZodDto(widgetDataSchema) {}
export class SaveFilterDto extends createZodDto(saveFilterSchema) {}
export class SavedFilterDto extends createZodDto(savedFilterSchema) {}
export class SavedFilterListDto extends createZodDto(z.array(savedFilterSchema)) {}
export class SavedFilterQueryDto extends createZodDto(z.object({ archived: archivedFilterSchema })) {}
