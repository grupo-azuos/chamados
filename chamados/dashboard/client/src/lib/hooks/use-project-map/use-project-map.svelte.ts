import { createQuery } from '@tanstack/svelte-query';
import { MAX_PAGE_SIZE } from '@template/shared/schemas/pagination.schema';
import { type ProjectMapEntry } from '@template/shared/schemas/project-map.schema';
import { derived } from 'svelte/store';

import { readError } from '$lib/api/http-client';
import { softwareProjectsApi } from '$lib/api/software-projects.api';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';
import { persistedFilterStore } from '$lib/hooks/use-persisted-filters/use-persisted-filters.svelte';
import { type ProjectMapPositions } from '$lib/utils/project-map.util';

/**
 * O MODEL DO MAPA DOS PROJETOS — os fatos de cada sistema escolhido e as escolhas de quem olha
 * (quais projetos, onde cada ilha foi deixada e se a tela está em Cards ou Mapa), salvas como os
 * filtros. Só busca com o mapa à vista: na visão de cards ele não pesa.
 */
export const PROJECT_VIEWS = ['cards', 'map'] as const;
export type ProjectView = (typeof PROJECT_VIEWS)[number];

export type ProjectMapPrefs = {
  view: ProjectView;
  projectIds: string[];
  positions: ProjectMapPositions;
};

export type ProjectMapModel = {
  data: {
    view: ProjectView;
    entries: ProjectMapEntry[];
    projects: { id: number; name: string }[];
    projectIds: string[];
    positions: ProjectMapPositions;
  };
  state: { isLoading: boolean; error: string | null };
  actions: {
    onViewChange: (view: ProjectView) => void;
    onProjectsChange: (projectIds: string[]) => void;
    onIslandMove: (projectId: string, position: { x: number; y: number }) => void;
    onResetLayout: () => void;
  };
};

const DEFAULTS: ProjectMapPrefs = { view: 'cards', projectIds: [], positions: {} };

const isPoint = (point: unknown): boolean =>
  typeof point === 'object' &&
  point !== null &&
  Number.isFinite((point as { x: unknown }).x) &&
  Number.isFinite((point as { y: unknown }).y);

/** O salvo vira escolhas bem formadas — ou o padrão, campo a campo. */
export function parseProjectMapPrefs(raw: unknown): ProjectMapPrefs | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const value = raw as Record<string, unknown>;
  const ids = value.projectIds;
  const positions = value.positions;

  return {
    view: PROJECT_VIEWS.includes(value.view as ProjectView) ? (value.view as ProjectView) : 'cards',
    projectIds: Array.isArray(ids) && ids.every((id) => typeof id === 'string') ? ids : [],
    positions:
      typeof positions === 'object' &&
      positions !== null &&
      !Array.isArray(positions) &&
      Object.values(positions).every(isPoint)
        ? (positions as ProjectMapPositions)
        : {},
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
        queryKey: ['software-projects', 'map', current.projectIds],
        queryFn: () => softwareProjectsApi.map(current.projectIds),
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

  return {
    data: {
      get view() {
        return prefs.current.view;
      },
      get entries() {
        return map.current.data ?? [];
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
      onResetLayout: () => prefsStore.update((current) => ({ ...current, positions: {} })),
    },
  };
}
