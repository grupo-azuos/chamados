import { createQuery } from '@tanstack/svelte-query';
import { type Holiday } from '@template/shared/schemas/holiday.schema';
import { derived, writable } from 'svelte/store';

import { holidaysApi } from '$lib/api/holidays.api';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';
import {
  HOLIDAY_STATE_OPTIONS,
  holidayStateOf,
  readHolidayState,
  writeHolidayState,
} from '$lib/utils/holiday-state.util';

/** Feriado do ano não muda no meio do dia: uma busca por ano e UF, guardada por 12 horas. */
const HOLIDAYS_STALE_MS = 12 * 60 * 60 * 1000;

export type HolidayStateChoice = { value: string; options: { value: string; label: string }[] };

/**
 * OS FERIADOS DOS ANOS À MOSTRA — nacionais e os da UF escolhida (Goiás de saída, a UF da casa),
 * para os blocos de calendário do painel. Zero marcação.
 *
 * Feriado é enfeite do calendário: ano que falhou (ou ainda não chegou) simplesmente não tem
 * feriado na tela, e o calendário segue com o resto.
 */
export function useHolidaysModel(years: readonly number[]) {
  const chosen = writable(readHolidayState());
  const state = mirrorStore(chosen);
  const queries = years.map((year) =>
    mirrorStore(
      createQuery(
        derived(chosen, (uf) => ({
          queryKey: ['holidays', year, uf],
          queryFn: () => holidaysApi.list(year, uf),
          staleTime: HOLIDAYS_STALE_MS,
        })),
      ),
    ),
  );

  return {
    get holidays(): Holiday[] {
      return queries.flatMap((query) => query.current.data?.holidays ?? []);
    },
    get holidayState(): HolidayStateChoice {
      return { value: state.current, options: HOLIDAY_STATE_OPTIONS };
    },
    onHolidayStateChange: (next: string) => {
      const uf = holidayStateOf(next);
      if (!uf) return;
      chosen.set(uf);
      writeHolidayState(uf);
    },
  };
}
