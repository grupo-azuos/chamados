import { createQuery } from '@tanstack/svelte-query';
import { MAX_PAGE_SIZE } from '@template/shared/schemas/pagination.schema';
import {
  TRACEABILITY_FOCUSES,
  type TraceabilityFocus,
  type TraceabilityGraph,
} from '@template/shared/schemas/traceability.schema';
import { derived, writable } from 'svelte/store';

import { computersApi } from '$lib/api/computers.api';
import { readError } from '$lib/api/http-client';
import { ticketsApi } from '$lib/api/tickets.api';
import { traceabilityApi } from '$lib/api/traceability.api';
import { type AzuosComboboxFieldOption } from '$lib/components/azuos-combobox-field/azuos-combobox-field.svelte';
import { type AzuosPersonPickerPerson } from '$lib/components/azuos-person-picker-field/azuos-person-picker-field.svelte';
import { useDepartmentOptionsModel } from '$lib/hooks/use-department-options/use-department-options.svelte';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';
import { persistedFilterStore } from '$lib/hooks/use-persisted-filters/use-persisted-filters.svelte';

/**
 * O MODEL DA RASTREABILIDADE — o ponto de partida escolhido (por computador, departamento ou
 * pessoa, e qual), salvo como os filtros, as opções de cada um e o mapa que a API devolve. Só busca
 * o mapa depois da escolha.
 */
export type TraceabilityPrefs = { focus: TraceabilityFocus; id: string };

export type TraceabilityModel = {
  data: {
    focus: TraceabilityFocus;
    id: string;
    computers: AzuosComboboxFieldOption[];
    departments: AzuosComboboxFieldOption[];
    people: AzuosPersonPickerPerson[];
    graph: TraceabilityGraph | null;
  };
  state: { isLoading: boolean; error: string | null };
  actions: {
    onFocusChange: (focus: TraceabilityFocus) => void;
    onIdChange: (id: string) => void;
  };
};

const DEFAULTS: TraceabilityPrefs = { focus: 'computer', id: '' };

/** O salvo vira uma escolha bem formada — ou o padrão, campo a campo. */
export function parseTraceabilityPrefs(raw: unknown): TraceabilityPrefs | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const value = raw as Record<string, unknown>;
  const focus = TRACEABILITY_FOCUSES.includes(value.focus as TraceabilityFocus)
    ? (value.focus as TraceabilityFocus)
    : 'computer';

  return { focus, id: typeof value.id === 'string' ? value.id : '' };
}

export function useTraceabilityModel(): TraceabilityModel {
  const prefsStore = persistedFilterStore<TraceabilityPrefs>({
    screen: 'traceability',
    defaults: DEFAULTS,
    parse: parseTraceabilityPrefs,
  });
  const prefs = mirrorStore(prefsStore);
  const departments = useDepartmentOptionsModel();

  const graph = mirrorStore(
    createQuery(
      derived(prefsStore, (current) => ({
        queryKey: ['traceability', current.focus, current.id],
        queryFn: () => traceabilityApi.graph(current.focus, current.id),
        enabled: current.id !== '',
      })),
    ),
  );
  const computers = mirrorStore(
    createQuery(
      writable({
        queryKey: ['traceability', 'computer-options'],
        queryFn: () => computersApi.list({ page: 1, pageSize: MAX_PAGE_SIZE }),
        staleTime: 60_000,
      }),
    ),
  );
  const people = mirrorStore(
    createQuery(
      writable({
        queryKey: ['tickets', 'people-options'],
        queryFn: () => ticketsApi.peopleOptions(),
        staleTime: 5 * 60_000,
      }),
    ),
  );

  return {
    data: {
      get focus() {
        return prefs.current.focus;
      },
      get id() {
        return prefs.current.id;
      },
      get computers() {
        return (computers.current.data?.items ?? []).map((computer) => ({
          value: String(computer.id),
          label: computer.departmentName
            ? `${computer.name} · ${computer.departmentName}`
            : computer.name,
        }));
      },
      get departments() {
        return departments.officialOptions;
      },
      get people() {
        return (people.current.data ?? []).map((person) => ({
          id: person.id,
          name: person.name,
          photo: person.avatarUrl ?? null,
        }));
      },
      get graph() {
        return prefs.current.id ? (graph.current.data ?? null) : null;
      },
    },
    state: {
      get isLoading() {
        return prefs.current.id !== '' && graph.current.isPending;
      },
      get error() {
        return graph.current.error ? readError(graph.current.error) : null;
      },
    },
    actions: {
      /* Trocar o "Ver por" esquece a escolha: o id de um computador não é o de uma pessoa. */
      onFocusChange: (focus) =>
        prefsStore.update((current) => (current.focus === focus ? current : { focus, id: '' })),
      onIdChange: (id) => prefsStore.update((current) => ({ ...current, id })),
    },
  };
}
