import { type DepartmentCatalogResponse } from '@template/shared/schemas/department.schema';

import { apiRequest } from './http-client';

export const departmentsApi = {
  /** Os departamentos do RH e, à parte, os que existem só aqui. */
  catalog: () => apiRequest<DepartmentCatalogResponse>('/departments'),
};
