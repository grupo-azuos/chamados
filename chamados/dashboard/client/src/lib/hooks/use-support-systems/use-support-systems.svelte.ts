import { createQuery } from '@tanstack/svelte-query';
import { type SupportSystem } from '@template/shared/schemas/project-map.schema';
import { writable } from 'svelte/store';

import { goto } from '$app/navigation';
import { readError } from '$lib/api/http-client';
import { softwareProjectsApi } from '$lib/api/software-projects.api';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';

/**
 * O MODEL DO ANDAMENTO DOS SISTEMAS na Central — a lista, a busca (pelo nome e pelo para que serve)
 * e o card que abre o mapa do sistema.
 */
export type SupportSystemsModel = {
  data: { systems: SupportSystem[]; search: string; total: number };
  state: { isLoading: boolean; error: string | null };
  actions: { onSearch: (value: string) => void; onOpen: (id: number) => void; onRetry: () => void };
};

/** A busca: o nome e a descrição, sem diferença de maiúscula. */
export function filterSystems(systems: readonly SupportSystem[], search: string): SupportSystem[] {
  const wanted = search.trim().toLocaleLowerCase('pt-BR');
  if (!wanted) return [...systems];

  return systems.filter((system) =>
    [system.name, system.description ?? ''].some((text) =>
      text.toLocaleLowerCase('pt-BR').includes(wanted),
    ),
  );
}

export function useSupportSystemsModel(): SupportSystemsModel {
  const list = mirrorStore(
    createQuery(
      writable({
        queryKey: ['support', 'systems'],
        queryFn: () => softwareProjectsApi.supportList(),
      }),
    ),
  );
  let search = $state('');

  return {
    data: {
      get systems() {
        return filterSystems(list.current.data ?? [], search);
      },
      get search() {
        return search;
      },
      get total() {
        return list.current.data?.length ?? 0;
      },
    },
    state: {
      get isLoading() {
        return list.current.isPending;
      },
      get error() {
        return list.current.error ? readError(list.current.error) : null;
      },
    },
    actions: {
      onSearch: (value) => (search = value),
      onOpen: (id) => void goto(`/support/systems/${id}`),
      onRetry: () => void list.current.refetch(),
    },
  };
}
