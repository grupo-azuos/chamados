import { createQuery } from '@tanstack/svelte-query';
import { derived, writable } from 'svelte/store';

import { readError } from '$lib/api/http-client';
import { softwareProjectsApi } from '$lib/api/software-projects.api';
import { ticketsApi } from '$lib/api/tickets.api';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';
import { persistedFilterStore } from '$lib/hooks/use-persisted-filters/use-persisted-filters.svelte';
import {
  parseProjectMapPrefs,
  type ProjectMapModel,
  type ProjectMapPrefs,
} from '$lib/hooks/use-project-map/use-project-map.svelte';

/**
 * O MODEL DO MAPA DE UM SISTEMA NA CENTRAL — o mesmo mapa da tela de Projetos, de um sistema só,
 * para quem pede chamado. As escolhas (período, pessoa, onde a ilha ficou, "só merges") ficam
 * salvas como as do painel, mas noutro lugar: são de outra tela.
 */
export type SupportSystemMapModel = Omit<ProjectMapModel, 'data'> & {
  data: Omit<ProjectMapModel['data'], 'view'> & { name: string | null };
};

const DEFAULTS: ProjectMapPrefs = {
  view: 'map',
  projectIds: [],
  positions: {},
  from: null,
  to: null,
  personId: '',
  onlyMerges: false,
};

export function useSupportSystemMapModel(id: number): SupportSystemMapModel {
  const prefsStore = persistedFilterStore<ProjectMapPrefs>({
    screen: 'support-system-map',
    defaults: DEFAULTS,
    parse: parseProjectMapPrefs,
  });
  const prefs = mirrorStore(prefsStore);
  const map = mirrorStore(
    createQuery(
      derived(prefsStore, (current) => ({
        queryKey: ['support', 'systems', id, 'map', current.from, current.to, current.personId],
        queryFn: () =>
          softwareProjectsApi.supportMap(id, {
            from: current.from,
            to: current.to,
            personId: current.personId,
          }),
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
      get name() {
        return map.current.data?.entries[0]?.project.name ?? null;
      },
      get entries() {
        return map.current.data?.entries ?? [];
      },
      projects: [],
      projectIds: [],
      get positions() {
        return prefs.current.positions;
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
    },
    state: {
      get isLoading() {
        return map.current.isPending;
      },
      get error() {
        return map.current.error ? readError(map.current.error) : null;
      },
    },
    actions: {
      onViewChange: () => {},
      onProjectsChange: () => {},
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
