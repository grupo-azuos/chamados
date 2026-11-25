import { createQuery } from '@tanstack/svelte-query';
import { MAX_PAGE_SIZE } from '@template/shared/schemas/pagination.schema';
import { type ProjectMapEntry } from '@template/shared/schemas/project-map.schema';
import { derived, writable } from 'svelte/store';

import { readError } from '$lib/api/http-client';
import { softwareProjectsApi } from '$lib/api/software-projects.api';
import { ticketsApi } from '$lib/api/tickets.api';
import { type AzuosPersonPickerPerson } from '$lib/components/azuos-person-picker-field/azuos-person-picker-field.svelte';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';
import { persistedFilterStore } from '$lib/hooks/use-persisted-filters/use-persisted-filters.svelte';
import { type ProjectMapPositions } from '$lib/utils/project-map.util';

/**
 * O MODEL DO MAPA DOS PROJETOS — os fatos de cada sistema escolhido e as escolhas de quem olha
 * (quais projetos, o período, a pessoa, onde cada ilha foi deixada, se o git graph mostra só os
 * merges e as branches, e se a tela está em Cards ou Mapa), salvas como os filtros. Só busca com o
 * mapa à vista: na visão de cards ele não pesa.
 */
export const PROJECT_VIEWS = ['cards', 'map'] as const;
export type ProjectView = (typeof PROJECT_VIEWS)[number];

export type ProjectMapPrefs = {
  view: ProjectView;
  projectIds: string[];
  positions: ProjectMapPositions;
  from: string | null;
  to: string | null;
  /** A pessoa do filtro (o id); vazio é todo mundo. */
  personId: string;
  /** O git graph sem os commits do meio: só os merges e as pontas das branches. */
  onlyMerges: boolean;
};

export type ProjectMapModel = {
  data: {
    view: ProjectView;
    entries: ProjectMapEntry[];
    projects: { id: number; name: string }[];
    projectIds: string[];
    positions: ProjectMapPositions;
    period: { from: string | null; to: string | null };
    personId: string;
    people: AzuosPersonPickerPerson[];
    /** A conta do GitHub da pessoa do filtro — o git graph acha os commits dela por ela. */
    personLogin: string | null;
    onlyMerges: boolean;
  };
  state: { isLoading: boolean; error: string | null };
  actions: {
    onViewChange: (view: ProjectView) => void;
    onProjectsChange: (projectIds: string[]) => void;
    onIslandMove: (projectId: string, position: { x: number; y: number }) => void;
    onResetLayout: () => void;
    onPeriodChange: (period: { from: string | null; to: string | null }) => void;
    onPersonChange: (personId: string) => void;
    onOnlyMergesChange: (onlyMerges: boolean) => void;
  };
};

const DEFAULTS: ProjectMapPrefs = {
  view: 'cards',
  projectIds: [],
  positions: {},
  from: null,
  to: null,
  personId: '',
  onlyMerges: false,
};

const isDay = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

const isPoint = (point: unknown): boolean =>
  typeof point === 'object' &&
  point !== null &&
  Number.isFinite((point as { x: unknown }).x) &&
  Number.isFinite((point as { y: unknown }).y);

function positionsOf(positions: unknown): ProjectMapPositions {
  const isMap = typeof positions === 'object' && positions !== null && !Array.isArray(positions);

  return isMap && Object.values(positions).every(isPoint) ? (positions as ProjectMapPositions) : {};
}

function projectIdsOf(ids: unknown): string[] {
  return Array.isArray(ids) && ids.every((id) => typeof id === 'string') ? ids : [];
}

/** O salvo vira escolhas bem formadas — ou o padrão, campo a campo. */
export function parseProjectMapPrefs(raw: unknown): ProjectMapPrefs | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const value = raw as Record<string, unknown>;

  return {
    view: PROJECT_VIEWS.includes(value.view as ProjectView) ? (value.view as ProjectView) : 'cards',
    projectIds: projectIdsOf(value.projectIds),
    positions: positionsOf(value.positions),
    from: isDay(value.from) ? value.from : null,
    to: isDay(value.to) ? value.to : null,
    personId: typeof value.personId === 'string' ? value.personId : '',
    onlyMerges: value.onlyMerges === true,
  };
}

export function useProjectMapModel(): ProjectMapModel {
  const prefsStore = persistedFilterStore<ProjectMapPrefs>({
    screen: 'projects-map',
    defaults: DEFAULTS,
    parse: parseProjectMapPrefs,
  });
  const prefs = mirrorStore(prefsStore);
  const active = derived(prefsStore, (current) => current.view === 'map');

  const map = mirrorStore(
    createQuery(
      derived([prefsStore, active], ([current, enabled]) => ({
        queryKey: [
          'software-projects',
          'map',
          current.projectIds,
          current.from,
          current.to,
          current.personId,
        ],
        queryFn: () =>
          softwareProjectsApi.map(current.projectIds, {
            from: current.from,
            to: current.to,
            personId: current.personId,
          }),
        enabled,
      })),
    ),
  );
  const options = mirrorStore(
    createQuery(
      derived(active, (enabled) => ({
        queryKey: ['software-projects', 'map-options'],
        queryFn: () => softwareProjectsApi.list({ page: 1, pageSize: MAX_PAGE_SIZE }),
        enabled,
        staleTime: 60_000,
      })),
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
  const update = (change: Partial<ProjectMapPrefs>) =>
    prefsStore.update((current) => ({ ...current, ...change }));

  return {
    data: {
      get view() {
        return prefs.current.view;
      },
      get entries() {
        return map.current.data?.entries ?? [];
      },
      get period() {
        return { from: prefs.current.from, to: prefs.current.to };
      },
      get personId() {
        return prefs.current.personId;
      },
      get people() {
        return (people.current.data ?? []).map((person) => ({
          id: person.id,
          name: person.name,
          photo: person.avatarUrl ?? null,
        }));
      },
      get personLogin() {
        return map.current.data?.personLogin ?? null;
      },
      get onlyMerges() {
        return prefs.current.onlyMerges;
      },
      get projects() {
        return (options.current.data?.items ?? []).map((project) => ({
          id: project.id,
          name: project.name,
        }));
      },
      get projectIds() {
        return prefs.current.projectIds;
      },
      get positions() {
        return prefs.current.positions;
      },
    },
    state: {
      get isLoading() {
        return map.current.isPending && prefs.current.view === 'map';
      },
      get error() {
        return map.current.error ? readError(map.current.error) : null;
      },
    },
    actions: {
      onViewChange: (view) => prefsStore.update((current) => ({ ...current, view })),
      onProjectsChange: (projectIds) =>
        prefsStore.update((current) => ({ ...current, projectIds })),
      onIslandMove: (projectId, position) =>
        prefsStore.update((current) => ({
          ...current,
          positions: { ...current.positions, [projectId]: position },
        })),
      onResetLayout: () => update({ positions: {} }),
      onPeriodChange: (period) => update({ from: period.from, to: period.to }),
      onPersonChange: (personId) => update({ personId }),
      onOnlyMergesChange: (onlyMerges) => update({ onlyMerges }),
    },
  };
}
