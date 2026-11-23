import { drillParam } from '@template/shared/schemas/board-drill.schema';
import {
  type CreateSoftwareProjectInput,
  type SoftwareProject,
  type SoftwareProjectListQuery,
  type UpdateSoftwareProjectInput,
} from '@template/shared/schemas/software-project.schema';
import { type Paginated } from '@template/shared/schemas/pagination.schema';

import { type ProjectMap } from '@template/shared/schemas/project-map.schema';
import { apiRequest } from './http-client';

export const softwareProjectsApi = {
  /** O mapa dos projetos (os escolhidos, ou todos os em uso). */
  map: (ids: readonly string[] = []) =>
    apiRequest<ProjectMap>('/software-projects/map', {
      query: { ids: ids.length ? ids.join(',') : undefined },
    }),

  list: (query: Partial<SoftwareProjectListQuery> = {}) =>
    apiRequest<Paginated<SoftwareProject>>('/software-projects', {
      query: {
        drill: query.drill ? drillParam(query.drill) : undefined,
        page: query.page,
        pageSize: query.pageSize,
        search: query.search,
        status: query.status,
        archived: query.archived,
      },
    }),

  get: (id: number) => apiRequest<SoftwareProject>(`/software-projects/${id}`),

  create: (input: CreateSoftwareProjectInput) =>
    apiRequest<SoftwareProject>('/software-projects', {
      method: 'POST',
      body: input,
    }),

  update: (id: number, input: UpdateSoftwareProjectInput) =>
    apiRequest<SoftwareProject>(`/software-projects/${id}`, {
      method: 'PATCH',
      body: input,
    }),

  /** Exclui ARQUIVANDO: o sistema e o que é dele ficam, e `restore` o devolve. */
  remove: (id: number) =>
    apiRequest<void>(`/software-projects/${id}`, {
      method: 'DELETE',
    }),

  restore: (id: number) =>
    apiRequest<SoftwareProject>(`/software-projects/${id}/restore`, { method: 'POST' }),

  syncGithub: (id: number) =>
    apiRequest<{ synced: number; message: string }>(`/software-projects/${id}/sync-github`, {
      method: 'POST',
    }),

  /** Todos os sistemas de uma vez — só Super Administrador. */
  syncAllGithub: () =>
    apiRequest<{
      projects: number;
      prs: number;
      issues: number;
      failed: string[];
      message: string;
    }>('/software-projects/sync-github', { method: 'POST' }),
};
