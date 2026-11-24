import { createQuery } from '@tanstack/svelte-query';
import { MAX_PAGE_SIZE } from '@template/shared/schemas/pagination.schema';
import {
  TRACEABILITY_FOCUSES,
  type TraceabilityFocus,
  type TraceabilityGraph,
} from '@template/shared/schemas/traceability.schema';
import { derived, writable } from 'svelte/store';

import { goto } from '$app/navigation';
import { page } from '$app/state';
import { computersApi } from '$lib/api/computers.api';
import { readError } from '$lib/api/http-client';
import { ticketsApi } from '$lib/api/tickets.api';
import { traceabilityApi } from '$lib/api/traceability.api';
import { useDepartmentOptionsModel } from '$lib/hooks/use-department-options/use-department-options.svelte';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';
import { persistedFilterStore } from '$lib/hooks/use-persisted-filters/use-persisted-filters.svelte';
import {
  openRecordOf,
  searchOf,
  type TraceabilityOpenKind,
  withoutOpenRecord,
} from '$lib/utils/traceability-map.util';
import {
  computerPicks,
  departmentPicks,
  filterPicks,
  personPicks,
  type TraceabilityPick,
} from '$lib/utils/traceability-pick.util';

/**
 * O MODEL DA RASTREABILIDADE — como no Paralegal, O ENDEREÇO MANDA: o ponto de partida
 * (`?focus=computer&id=4`) e o registro aberto no diálogo (`&ticket=52`) estão nele. O link abre
 * direto no mapa e no diálogo, o voltar do navegador fecha o diálogo (ou volta ao mapa de antes), e a
 * última escolha fica salva para quem entra sem nada no endereço.
 */
export type TraceabilityPrefs = { focus: TraceabilityFocus; id: string };

export type TraceabilityModel = {
  data: {
    focus: TraceabilityFocus;
    id: string;
    /** O nome do ponto de partida escolhido ("Computador 04"); nulo antes da escolha. */
    choiceLabel: string | null;
    graph: TraceabilityGraph | null;
    /** O endereço de agora (sem o "?"): as caixas do mapa montam o link delas sobre ele. */
    params: string;
    open: { kind: TraceabilityOpenKind; id: number } | null;
    picker: {
      isOpen: boolean;
      picks: TraceabilityPick[];
      search: string;
      department: string;
      departments: { value: string; label: string }[];
    };
  };
  state: { isLoading: boolean; error: string | null; isPickerLoading: boolean };
  actions: {
    onFocusChange: (focus: TraceabilityFocus) => void;
    onOpenPicker: () => void;
    onClosePicker: () => void;
    onSearch: (value: string) => void;
    onDepartmentChange: (value: string) => void;
    onPick: (id: string) => void;
    onCloseRecord: () => void;
  };
};

const DEFAULTS: TraceabilityPrefs = { focus: 'computer', id: '' };
const NAVIGATE = { noScroll: true, keepFocus: true } as const;

/** O salvo vira uma escolha bem formada — ou o padrão, campo a campo. */
export function parseTraceabilityPrefs(raw: unknown): TraceabilityPrefs | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const value = raw as Record<string, unknown>;
  const focus = TRACEABILITY_FOCUSES.includes(value.focus as TraceabilityFocus)
    ? (value.focus as TraceabilityFocus)
    : 'computer';

  return { focus, id: typeof value.id === 'string' ? value.id : '' };
}

/** O registro aberto, como chave ("ticket:52"); nulo sem nenhum. */
function openKeyOf(params: URLSearchParams): string | null {
  const open = openRecordOf(params);

  return open ? `${open.kind}:${open.id}` : null;
}

/** O ponto de partida que o endereço diz; nulo quando ele não diz nenhum. */
export function choiceOf(params: URLSearchParams): TraceabilityPrefs | null {
  const focus = params.get('focus');
  if (!TRACEABILITY_FOCUSES.includes(focus as TraceabilityFocus)) return null;

  return { focus: focus as TraceabilityFocus, id: params.get('id') ?? '' };
}

export function useTraceabilityModel(): TraceabilityModel {
  const prefsStore = persistedFilterStore<TraceabilityPrefs>({
    screen: 'traceability',
    defaults: DEFAULTS,
    parse: parseTraceabilityPrefs,
  });
  const prefs = mirrorStore(prefsStore);
  const departments = useDepartmentOptionsModel();
  const choice = writable<TraceabilityPrefs>(DEFAULTS);

  let picker = $state({ isOpen: false, search: '', department: '' });
  const go = (search: string, replaceState = false) =>
    void goto(`?${search}`, { ...NAVIGATE, replaceState });
  /* Aberto daqui (um clique no mapa): fechar é voltar no histórico. Aberto por um link colado:
     não há para onde voltar, e fechar só tira o registro do endereço. */
  let wasOpenedHere = false;
  let previousOpen = openKeyOf(page.url.searchParams);

  const params = $derived(page.url.searchParams);
  const current = $derived(choiceOf(params) ?? prefs.current);

  $effect(() => {
    choice.set(current);
    const saved = prefs.current;
    if (current.id && (current.id !== saved.id || current.focus !== saved.focus))
      prefsStore.update(() => current);
  });
  /* Entrou sem nada no endereço: ele ganha a última escolha, para o link copiado levar a ela. */
  $effect(() => {
    if (!choiceOf(params) && prefs.current.id) {
      go(searchOf({ ...Object.fromEntries(params), ...prefs.current }), true);
    }
  });
  $effect(() => {
    const open = openKeyOf(params);
    if (open && !previousOpen) wasOpenedHere = true;
    if (!open) wasOpenedHere = false;
    previousOpen = open;
  });

  const graph = mirrorStore(
    createQuery(
      derived(choice, (value) => ({
        queryKey: ['traceability', value.focus, value.id],
        queryFn: () => traceabilityApi.graph(value.focus, value.id),
        enabled: value.id !== '',
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

  const allPicks = $derived.by((): TraceabilityPick[] => {
    const machines = computers.current.data?.items ?? [];
    if (current.focus === 'computer') return computerPicks(machines);
    if (current.focus === 'department')
      return departmentPicks(departments.officialOptions, machines);

    return personPicks(
      (people.current.data ?? []).map((person) => ({
        id: person.id,
        name: person.name,
        photo: person.avatarUrl ?? null,
      })),
    );
  });

  return {
    data: {
      get focus() {
        return current.focus;
      },
      get id() {
        return current.id;
      },
      get choiceLabel() {
        return current.id ? (allPicks.find((pick) => pick.id === current.id)?.title ?? null) : null;
      },
      get graph() {
        return current.id ? (graph.current.data ?? null) : null;
      },
      get params() {
        return params.toString();
      },
      get open() {
        return openRecordOf(params);
      },
      get picker() {
        return {
          isOpen: picker.isOpen,
          picks: filterPicks(allPicks, picker.search, picker.department),
          search: picker.search,
          department: picker.department,
          departments: departments.officialOptions,
        };
      },
    },
    state: {
      get isLoading() {
        return current.id !== '' && graph.current.isPending;
      },
      get error() {
        return graph.current.error ? readError(graph.current.error) : null;
      },
      get isPickerLoading() {
        return current.focus === 'person' ? people.current.isPending : computers.current.isPending;
      },
    },
    actions: {
      /* Trocar o "Ver por" esquece a escolha (o id de um computador não é o de uma pessoa) e já
         abre a busca do novo tipo. */
      onFocusChange: (focus) => {
        if (focus === current.focus) return;
        go(searchOf({ focus }));
        picker = { isOpen: true, search: '', department: '' };
      },
      onOpenPicker: () => (picker = { ...picker, isOpen: true }),
      onClosePicker: () => (picker = { ...picker, isOpen: false }),
      onSearch: (search) => (picker = { ...picker, search }),
      onDepartmentChange: (department) => (picker = { ...picker, department }),
      onPick: (id) => {
        picker = { isOpen: false, search: '', department: '' };
        go(searchOf({ focus: current.focus, id }));
      },
      onCloseRecord: () => {
        if (wasOpenedHere) return history.back();
        go(withoutOpenRecord(params).toString(), true);
      },
    },
  };
}
