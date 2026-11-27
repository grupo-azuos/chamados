import { createQuery } from '@tanstack/svelte-query';
import { writable } from 'svelte/store';

import { ticketsApi } from '$lib/api/tickets.api';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';
import { setPeopleDirectory } from './people-directory.svelte';

/**
 * Carrega o diretório de pessoas (com a foto) para o rosto de qualquer tela achar a foto.
 * Montado UMA vez, na casca das telas logadas. Falhar só deixa as iniciais — nunca quebra a tela.
 */
export function usePeopleDirectoryLoader(): void {
  const people = mirrorStore(
    createQuery(
      writable({
        queryKey: ['tickets', 'people-directory'],
        queryFn: () => ticketsApi.peopleDirectory(),
        staleTime: 5 * 60_000,
      }),
    ),
  );

  $effect(() => {
    const list = people.current.data;
    if (list) setPeopleDirectory(list);
  });
}
