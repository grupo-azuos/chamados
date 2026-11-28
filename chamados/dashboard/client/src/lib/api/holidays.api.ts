import { type HolidayList } from '@template/shared/schemas/holiday.schema';

import { apiRequest } from './http-client';

/** Os feriados nacionais e de uma UF num ano — o servidor busca na BrasilAPI. */
export const holidaysApi = {
  list: (year: number, state: string): Promise<HolidayList> =>
    apiRequest<HolidayList>('/holidays', { query: { year, state } }),
};
