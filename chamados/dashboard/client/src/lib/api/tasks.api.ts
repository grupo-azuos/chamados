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

import {
  type CreateTaskStageInput,
  type TaskStage,
  type UpdateTaskStageInput,
} from '@template/shared/schemas/task-stage.schema';
import { type RoleContext } from '@template/shared/domain/role-context.util';

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
        stageId: query.stageId,
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

  setStage: (id: number, stageId: number | null) =>
    apiRequest<Task>(`/tasks/${id}/stage`, { method: 'PUT', body: { stageId } }),

  stages: (area: RoleContext) => apiRequest<TaskStage[]>('/task-stages', { query: { area } }),

  createStage: (body: CreateTaskStageInput) =>
    apiRequest<TaskStage>('/task-stages', { method: 'POST', body }),

  updateStage: (id: number, body: UpdateTaskStageInput) =>
    apiRequest<TaskStage>(`/task-stages/${id}`, { method: 'PATCH', body }),

  moveStage: (id: number, direction: -1 | 1) =>
    apiRequest<TaskStage[]>(`/task-stages/${id}/move`, { method: 'POST', body: { direction } }),

  removeStage: (id: number) => apiRequest<void>(`/task-stages/${id}`, { method: 'DELETE' }),
};
