import {
  type CreateMaintenanceInput,
  type Maintenance,
  type MaintenanceListQuery,
  type MaintenanceSchedule,
  type PreventiveDue,
  type SaveMaintenanceScheduleInput,
  type UpdateMaintenanceInput,
} from '@template/shared/schemas/maintenance.schema';
import { type Paginated } from '@template/shared/schemas/pagination.schema';

import { apiRequest } from './http-client';

/**
 * Chamadas da API de manutenções. Nada aqui decide nada — é a tradução de uma intenção em
 * uma requisição, para que os view-models não montem URL à mão.
 */
export const maintenancesApi = {
  list: (query: Partial<MaintenanceListQuery>) =>
    apiRequest<Paginated<Maintenance>>('/maintenances', {
      query: {
        page: query.page,
        pageSize: query.pageSize,
        search: query.search,
        computerId: query.computerId,
        type: query.type,
        archived: query.archived,
      },
    }),

  /** A situação da preventiva de cada máquina do inventário — calculada a cada consulta. */
  preventive: () => apiRequest<PreventiveDue[]>('/maintenances/preventive'),

  findById: (id: number) => apiRequest<Maintenance>(`/maintenances/${id}`),

  create: (body: CreateMaintenanceInput) =>
    apiRequest<Maintenance>('/maintenances', { method: 'POST', body }),

  update: (id: number, body: UpdateMaintenanceInput) =>
    apiRequest<Maintenance>(`/maintenances/${id}`, { method: 'PATCH', body }),

  /** Exclui ARQUIVANDO: a linha fica, e `restore` a devolve. */
  remove: (id: number) => apiRequest<void>(`/maintenances/${id}`, { method: 'DELETE' }),

  restore: (id: number) => apiRequest<Maintenance>(`/maintenances/${id}/restore`, { method: 'POST' }),

  /** As manutenções agendadas — de uma máquina, ou de todas, da data mais próxima à mais distante. */
  schedules: (computerId?: number) =>
    apiRequest<MaintenanceSchedule[]>('/maintenances/schedules', { query: { computerId } }),

  /** Os agendamentos encerrados — cumpridos ou cancelados —, que o bloco "Removidos" mostra. */
  archivedSchedules: () =>
    apiRequest<MaintenanceSchedule[]>('/maintenances/schedules', { query: { archived: 'only' } }),

  /** Desfaz o cancelamento — pelo id do agendamento, não o da máquina. */
  restoreSchedule: (scheduleId: number) =>
    apiRequest<MaintenanceSchedule>(`/maintenances/schedules/${scheduleId}/restore`, {
      method: 'POST',
    }),

  /** Agenda ou remarca: uma por máquina, então chamar de novo troca a data. */
  saveSchedule: (computerId: number, body: SaveMaintenanceScheduleInput) =>
    apiRequest<MaintenanceSchedule>(`/maintenances/schedules/${computerId}`, { method: 'PUT', body }),

  cancelSchedule: (computerId: number) =>
    apiRequest<void>(`/maintenances/schedules/${computerId}`, { method: 'DELETE' }),
};
