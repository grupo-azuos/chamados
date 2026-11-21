import { type ArchivedFilter } from '@template/shared/schemas/archive.schema';
import {
  type Board,
  type BoardModule,
  type DashboardScope,
  type SaveBoardInput,
  type SavedFilter,
  type SaveFilterInput,
  type WidgetData,
  type WidgetQuery,
} from '@template/shared/schemas/dashboard-board.schema';

import { apiRequest } from './http-client';

/**
 * Chamadas da API dos painéis montados. O módulo vai sempre no endereço: cada módulo tem os
 * painéis e os filtros dele, e o servidor recusa fonte de outro módulo.
 */
export const dashboardBoardsApi = {
  board: (module: BoardModule, scope: DashboardScope) =>
    apiRequest<Board>(`/dashboard-boards/${module}/${scope}`),

  saveBoard: (module: BoardModule, scope: DashboardScope, body: SaveBoardInput) =>
    apiRequest<Board>(`/dashboard-boards/${module}/${scope}`, { method: 'PUT', body }),

  /** Os números de um bloco. POST porque a pergunta tem janela e filtros, mas só lê. */
  data: (module: BoardModule, body: WidgetQuery) =>
    apiRequest<WidgetData>(`/dashboard-boards/${module}/data`, { method: 'POST', body }),

  filters: (module: BoardModule, archived: ArchivedFilter = 'hide') =>
    apiRequest<SavedFilter[]>(`/dashboard-boards/${module}/filters`, { query: { archived } }),

  createFilter: (module: BoardModule, body: SaveFilterInput) =>
    apiRequest<SavedFilter>(`/dashboard-boards/${module}/filters`, { method: 'POST', body }),

  updateFilter: (module: BoardModule, id: string, body: SaveFilterInput) =>
    apiRequest<SavedFilter>(`/dashboard-boards/${module}/filters/${id}`, { method: 'PUT', body }),

  /** Arquiva: o filtro some da lista e volta por `restoreFilter`. */
  archiveFilter: (module: BoardModule, id: string) =>
    apiRequest<SavedFilter>(`/dashboard-boards/${module}/filters/${id}`, { method: 'DELETE' }),

  restoreFilter: (module: BoardModule, id: string) =>
    apiRequest<SavedFilter>(`/dashboard-boards/${module}/filters/${id}/restore`, { method: 'POST' }),
};
