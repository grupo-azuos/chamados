import { createZodDto } from '../../../lib/http/zod-dto';
import { departmentCatalogSchema } from '@template/shared/schemas/department.schema';

export class DepartmentCatalogDto extends createZodDto(departmentCatalogSchema) {}
