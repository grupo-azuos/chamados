import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { type MaintenanceSchedule } from '@template/shared/schemas/maintenance.schema';
import { SvelteMap } from 'svelte/reactivity';
import { writable } from 'svelte/store';

import { readError } from '$lib/api/http-client';
import { maintenancesApi } from '$lib/api/maintenances.api';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';
import { DASHBOARD_QUERY_KEY } from '$lib/hooks/use-dashboard/use-dashboard.svelte';

/**
 * Debaixo da chave das manutenções (`['maintenances']`) DE PROPÓSITO: registrar uma
 * manutenção já invalida essa chave, e é isso que faz o agendamento cumprido sumir da ficha
 * sem ninguém lembrar de avisar esta consulta.
 *
 * Escrita por extenso, e não importada de `use-maintenance-list`: aquele hook importa o do
 * inventário, que importa este — e a importação circular deixaria a chave indefinida na hora
 * de montar este array.
 */
export const MAINTENANCE_SCHEDULES_QUERY_KEY = ['maintenances', 'schedules'] as const;

/** A consulta de TODOS os agendamentos — a mesma para o Inventário e para a Manutenção. */
export function allSchedulesQuery() {
  return createQuery(
    writable({
      queryKey: [...MAINTENANCE_SCHEDULES_QUERY_KEY, 'all'],
      queryFn: () => maintenancesApi.schedules(),
    }),
  );
}

/** Os agendamentos por máquina, para cada linha achar o seu sem varrer a lista inteira. */
export function schedulesByComputer(
  schedules: readonly MaintenanceSchedule[] | undefined,
): Map<number, MaintenanceSchedule> {
  return new SvelteMap((schedules ?? []).map((schedule) => [schedule.computerId, schedule]));
}

export type MaintenanceScheduleModel = {
  data: { schedule: MaintenanceSchedule | null };
  state: { isLoading: boolean; isCancelling: boolean; error: string | null };
  actions: { onCancel: () => void };
};

/**
 * O agendamento de UMA máquina — o que a ficha mostra — e o cancelar dele.
 *
 * Agendar e remarcar NÃO estão aqui: o formulário tem view-model próprio
 * (`use-maintenance-schedule-form`), que nasce e morre com o diálogo.
 */
export function useMaintenanceScheduleModel(computerId: number): MaintenanceScheduleModel {
  const queryClient = useQueryClient();

  const schedule = mirrorStore(
    createQuery(
      writable({
        queryKey: [...MAINTENANCE_SCHEDULES_QUERY_KEY, 'computer', computerId],
        queryFn: () => maintenancesApi.schedules(computerId),
      }),
    ),
  );

  const cancel = mirrorStore(
    createMutation({
      mutationFn: () => maintenancesApi.cancelSchedule(computerId),
      onSuccess: () => invalidateSchedules(queryClient),
    }),
  );

  return {
    get data() {
      return { schedule: schedule.current.data?.[0] ?? null };
    },
    get state() {
      return {
        isLoading: schedule.current.isPending,
        isCancelling: cancel.current.isPending,
        error: readError(cancel.current.error),
      };
    },
    actions: {
      onCancel: () => cancel.current.mutate(),
    },
  };
}

/** O agendamento aparece na ficha, no Inventário, na Manutenção e no Painel — os quatro relêem. */
export async function invalidateSchedules(
  queryClient: ReturnType<typeof useQueryClient>,
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: MAINTENANCE_SCHEDULES_QUERY_KEY }),
    queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY }),
  ]);
}
