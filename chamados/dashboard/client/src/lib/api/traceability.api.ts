import {
  type TraceabilityFocus,
  type TraceabilityGraph,
} from '@template/shared/schemas/traceability.schema';

import { apiRequest } from './http-client';

export const traceabilityApi = {
  /** O mapa a partir de um computador, um departamento ou uma pessoa. */
  graph: (focus: TraceabilityFocus, id: string) =>
    apiRequest<TraceabilityGraph>('/traceability', { query: { focus, id } }),
};
