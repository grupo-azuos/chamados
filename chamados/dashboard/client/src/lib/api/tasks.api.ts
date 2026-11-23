import {
  type AddTaskLinksInput,
  type CreateTaskInput,
  type SaveTaskStepsInput,
  type SetTaskStatusInput,
  type Task,
  type TaskHistoryEntry,
  type TaskListQuery,
  type TaskPage,
  type UpdateTaskInput,
} from '@template/shared/schemas/task.schema';

import { apiRequest } from './http-client';

/**
 * Chamadas da API de tarefas. Nada aqui decide nada — é a tradução de uma intenção em uma
 * requisição, para que os view-models não montem URL à mão.
 */
export const tasksApi = {
  list: (query: Partial<TaskListQuery> & Pick<TaskListQuery, 'area'>) =>
    apiRequest<TaskPage>('/tasks', {
      query: {
        area: query.area,
        page: query.page,
        pageSize: query.pageSize,
        status: query.status,
        origin: query.origin,
        ownerId: query.ownerId,
        mine: query.mine ? 'true' : undefined,
        linkKind: query.linkKind,
        linkId: query.linkId,
        search: query.search,
        overdue: query.overdue ? 'true' : undefined,
        from: query.from,
        to: query.to,
      },
    }),

  findById: (id: number) => apiRequest<Task>(`/tasks/${id}`),

  history: (id: number) => apiRequest<TaskHistoryEntry[]>(`/tasks/${id}/history`),

  create: (body: CreateTaskInput) => apiRequest<Task>('/tasks', { method: 'POST', body }),

  update: (id: number, body: UpdateTaskInput) =>
    apiRequest<Task>(`/tasks/${id}`, { method: 'PATCH', body }),

  setStatus: (id: number, body: SetTaskStatusInput) =>
    apiRequest<Task>(`/tasks/${id}/status`, { method: 'POST', body }),

  saveSteps: (id: number, body: SaveTaskStepsInput) =>
    apiRequest<Task>(`/tasks/${id}/steps`, { method: 'PUT', body }),

  setStepDone: (id: number, stepId: number, done: boolean) =>
    apiRequest<Task>(`/tasks/${id}/steps/${stepId}`, { method: 'PATCH', body: { done } }),

  addLinks: (id: number, body: AddTaskLinksInput) =>
    apiRequest<Task>(`/tasks/${id}/links`, { method: 'POST', body }),

  removeLink: (id: number, linkId: number) =>
    apiRequest<Task>(`/tasks/${id}/links/${linkId}`, { method: 'DELETE' }),

  remove: (id: number) => apiRequest<void>(`/tasks/${id}`, { method: 'DELETE' }),
};
