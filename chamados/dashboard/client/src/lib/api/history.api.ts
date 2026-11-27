import { type HistoryPage, type HistoryQuery } from '@template/shared/schemas/history.schema';

import { apiRequest } from './http-client';

/** A linha do tempo de um módulo — padrão em todo sistema do grupo (regra `history-standard`). */
export const historyApi = {
  list: (query: Partial<HistoryQuery> & Pick<HistoryQuery, 'module'>) =>
    apiRequest<HistoryPage>('/history', {
      query: {
        module: query.module,
        page: query.page,
        pageSize: query.pageSize,
        targetType: query.targetType,
        kind: query.kind,
        actor: query.actor,
        from: query.from,
        to: query.to,
        search: query.search,
      },
    }),
};
