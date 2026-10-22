import { createZodDto } from 'nestjs-zod';
import { departmentCatalogSchema } from '@template/shared/schemas/department.schema';

export class DepartmentCatalogDto extends createZodDto(departmentCatalogSchema) {}
