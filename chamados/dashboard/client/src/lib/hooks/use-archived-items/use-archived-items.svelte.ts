import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { writable } from 'svelte/store';

import { readError } from '$lib/api/http-client';
import { inventoryItemsApi } from '$lib/api/inventory-items.api';
import { maintenanceQuotesApi } from '$lib/api/maintenance-quotes.api';
import { maintenancesApi } from '$lib/api/maintenances.api';
import { partsApi } from '$lib/api/parts.api';
import { rolesApi } from '$lib/api/roles.api';
import { softwareProjectsApi } from '$lib/api/software-projects.api';
import { softwareScheduleApi } from '$lib/api/software-schedule.api';
import { ticketsApi } from '$lib/api/tickets.api';
import { type AzuosArchivedItem } from '$lib/components/azuos-archived-list/azuos-archived-list.svelte';
import { DASHBOARD_QUERY_KEY } from '$lib/hooks/use-dashboard/use-dashboard.svelte';
import { INVENTORY_QUERY_KEY } from '$lib/hooks/use-inventory-list/use-inventory-list.svelte';
import { MAINTENANCE_DASHBOARD_QUERY_KEY } from '$lib/hooks/use-inventory-movement-form/use-inventory-movement-form.svelte';
import { MAINTENANCES_QUERY_KEY } from '$lib/hooks/use-maintenance-list/use-maintenance-list.svelte';
import { MAINTENANCE_QUOTES_QUERY_KEY } from '$lib/hooks/use-maintenance-quote-list/use-maintenance-quote-list.svelte';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';
import { PARTS_QUERY_KEY } from '$lib/hooks/use-part-list/use-part-list.svelte';
import { ROLES_QUERY_KEY } from '$lib/hooks/use-roles/use-roles.svelte';
import { SOFTWARE_DASHBOARD_QUERY_KEY } from '$lib/hooks/use-software-dashboard/use-software-dashboard.svelte';
import { SOFTWARE_PROJECTS_QUERY_KEY } from '$lib/hooks/use-software-project-list/use-software-project-list.svelte';
import { SOFTWARE_SCHEDULE_QUERY_KEY } from '$lib/hooks/use-software-schedule/use-software-schedule.svelte';
import { TICKETS_QUERY_KEY } from '$lib/hooks/use-ticket-list/use-ticket-list.svelte';
import {
  archivedInventoryItem,
  archivedMaintenanceItem,
  archivedMovementItem,
  archivedProjectItem,
  archivedQuoteItem,
  archivedRoleItem,
  archivedScheduleEventItem,
  archivedScheduleItem,
  parseTicketRemovedKey,
  archivedScheduleWindow,
  ticketRemovedItem,
} from '$lib/utils/archived-item.util';

/**
 * O BLOCO "REMOVIDOS" DE UMA TELA: busca o que foi arquivado quando a pessoa abre o bloco, e
 * desfaz um deles.
 *
 * Um hook só para todas as telas, porque o gesto é o mesmo em todas: a tela diz como buscar
 * os arquivados, como cada um vira linha e como desfazer, e quais listas reler depois (a
 * lista da tela, o painel). A busca só acontece com o bloco aberto: quem nunca abre "Removidos"
 * não paga a consulta.
 */
export type ArchivedItemsOptions<TRow> = {
  /** A chave da consulta dos arquivados — dentro da chave da lista, para reler junto. */
  queryKey: readonly unknown[];
  fetch: () => Promise<TRow[]>;
  toItem: (row: TRow) => AzuosArchivedItem;
  /** Desfaz pelo `key` da linha (o mesmo de `toItem`). */
  restore: (key: string) => Promise<unknown>;
  /** As chaves a reler depois de desfazer: a lista da tela volta a mostrar o item. */
  invalidate: readonly (readonly unknown[])[];
};

export type ArchivedItemsModel = {
  data: { items: AzuosArchivedItem[] };
  state: { isLoading: boolean; restoringKey: string | null; error: string | null };
  actions: { onOpenChange: (isOpen: boolean) => void; onRestore: (key: string) => void };
};

export function useArchivedItemsModel<TRow>(options: ArchivedItemsOptions<TRow>): ArchivedItemsModel {
  const queryClient = useQueryClient();
  const queryOptions = writable({
    queryKey: [...options.queryKey],
    queryFn: options.fetch,
    enabled: false,
  });

  const archived = mirrorStore(createQuery(queryOptions));
  let isOpen = $state(false);

  const restore = mirrorStore(
    createMutation({
      mutationFn: (key: string) => options.restore(key),
      onSuccess: () =>
        Promise.all(
          [options.queryKey, ...options.invalidate].map((queryKey) =>
            queryClient.invalidateQueries({ queryKey: [...queryKey] }),
          ),
        ),
    }),
  );

  return {
    get data() {
      return { items: (archived.current.data ?? []).map(options.toItem) };
    },
    get state() {
      return {
        /* Fechado nunca está "carregando": a consulta nem começou. */
        isLoading: isOpen && archived.current.isPending,
        restoringKey: restore.current.isPending ? (restore.current.variables ?? null) : null,
        error: readError(archived.current.error) ?? readError(restore.current.error),
      };
    },
    actions: {
      onOpenChange: (next) => {
        isOpen = next;
        if (next) queryOptions.update((current) => ({ ...current, enabled: true }));
      },
      onRestore: (key) => restore.current.mutate(key),
    },
  };
}

/* ── Os blocos de cada tela ───────────────────────────────────────────────────────────────
   Cada um diz só o que muda: de onde vêm os arquivados, como desfazer e o que reler. A chave
   fica DENTRO da chave da lista da tela: excluir algo já relê a lista, e o bloco junto. */

/** Uma página grande o bastante para os removidos, que são poucos. */
const ARCHIVED_PAGE = { page: 1, pageSize: 100, archived: 'only' } as const;

export function useArchivedMaintenancesModel(): ArchivedItemsModel {
  return useArchivedItemsModel({
    queryKey: [...MAINTENANCES_QUERY_KEY, 'archived'],
    fetch: async () => (await maintenancesApi.list(ARCHIVED_PAGE)).items,
    toItem: archivedMaintenanceItem,
    restore: (key) => maintenancesApi.restore(Number(key)),
    invalidate: [MAINTENANCES_QUERY_KEY, DASHBOARD_QUERY_KEY],
  });
}

/** Os agendamentos encerrados (cumpridos ou cancelados). Desfazer reabre o compromisso. */
export function useArchivedSchedulesModel(): ArchivedItemsModel {
  return useArchivedItemsModel({
    queryKey: [...MAINTENANCES_QUERY_KEY, 'schedules', 'archived'],
    fetch: () => maintenancesApi.archivedSchedules(),
    toItem: archivedScheduleItem,
    restore: (key) => maintenancesApi.restoreSchedule(Number(key)),
    invalidate: [MAINTENANCES_QUERY_KEY, DASHBOARD_QUERY_KEY],
  });
}

export function useArchivedInventoryModel(): ArchivedItemsModel {
  return useArchivedItemsModel({
    queryKey: [...INVENTORY_QUERY_KEY, 'archived'],
    fetch: async () => (await inventoryItemsApi.list(ARCHIVED_PAGE)).items,
    toItem: archivedInventoryItem,
    restore: (key) => inventoryItemsApi.restore(Number(key)),
    invalidate: [INVENTORY_QUERY_KEY, MAINTENANCE_DASHBOARD_QUERY_KEY],
  });
}

export function useArchivedQuotesModel(): ArchivedItemsModel {
  return useArchivedItemsModel({
    queryKey: [...MAINTENANCE_QUOTES_QUERY_KEY, 'archived'],
    fetch: async () => (await maintenanceQuotesApi.list(ARCHIVED_PAGE)).items,
    toItem: archivedQuoteItem,
    restore: (key) => maintenanceQuotesApi.restore(Number(key)),
    invalidate: [MAINTENANCE_QUOTES_QUERY_KEY, MAINTENANCE_DASHBOARD_QUERY_KEY],
  });
}

/** Os estornos do depósito da TI. Desfazer devolve a linha ao extrato e refaz o saldo. */
export function useArchivedPartMovementsModel(): ArchivedItemsModel {
  return useArchivedItemsModel({
    queryKey: [...PARTS_QUERY_KEY, 'movements', 'archived'],
    fetch: async () => (await partsApi.movements(ARCHIVED_PAGE)).items,
    toItem: archivedMovementItem,
    restore: (key) => partsApi.restoreMovement(Number(key)),
    invalidate: [PARTS_QUERY_KEY, DASHBOARD_QUERY_KEY],
  });
}

export function useArchivedProjectsModel(): ArchivedItemsModel {
  return useArchivedItemsModel({
    queryKey: [...SOFTWARE_PROJECTS_QUERY_KEY, 'archived'],
    fetch: async () => (await softwareProjectsApi.list(ARCHIVED_PAGE)).items,
    toItem: archivedProjectItem,
    restore: (key) => softwareProjectsApi.restore(Number(key)),
    invalidate: [SOFTWARE_PROJECTS_QUERY_KEY, SOFTWARE_DASHBOARD_QUERY_KEY],
  });
}

/** Os itens excluídos da Agenda (na janela de `archivedScheduleWindow`). */
export function useArchivedScheduleEventsModel(): ArchivedItemsModel {
  const range = archivedScheduleWindow();

  return useArchivedItemsModel({
    queryKey: [...SOFTWARE_SCHEDULE_QUERY_KEY, 'archived', range.startDate, range.endDate],
    fetch: () => softwareScheduleApi.list({ ...range, archived: 'only' }),
    toItem: archivedScheduleEventItem,
    restore: (key) => softwareScheduleApi.restore(Number(key)),
    invalidate: [SOFTWARE_SCHEDULE_QUERY_KEY],
  });
}

/** Os módulos tirados da equipe. Desfazer devolve o acesso à pessoa. */
export function useArchivedRolesModel(): ArchivedItemsModel {
  return useArchivedItemsModel({
    queryKey: [...ROLES_QUERY_KEY, 'archived'],
    fetch: () => rolesApi.listArchived(),
    toItem: archivedRoleItem,
    restore: (key) => rolesApi.restore(Number(key)),
    invalidate: [ROLES_QUERY_KEY],
  });
}

/** O que saiu da ficha de um chamado — de todas as ligações dele de uma vez. */
export function useTicketRemovedModel(ticketId: number): ArchivedItemsModel {
  return useArchivedItemsModel({
    queryKey: [...TICKETS_QUERY_KEY, 'removed', ticketId],
    fetch: () => ticketsApi.removed(ticketId),
    toItem: ticketRemovedItem,
    restore: async (key) => {
      const parsed = parseTicketRemovedKey(key);
      if (!parsed) return;

      await ticketsApi.restoreRemoved(ticketId, parsed.kind, parsed.id);
    },
    invalidate: [TICKETS_QUERY_KEY],
  });
}
