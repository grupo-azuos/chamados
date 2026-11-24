import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { type Part, type PartMovement } from '@template/shared/schemas/part.schema';
import { writable } from 'svelte/store';

import { readError } from '$lib/api/http-client';
import { partsApi } from '$lib/api/parts.api';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';
import { PARTS_QUERY_KEY } from '$lib/hooks/use-part-list/use-part-list.svelte';

export type PartLedgerModel = {
  data: {
    part: Part;
    movements: PartMovement[];
    /** Qual linha está esperando confirmação de exclusão. */
    removing: PartMovement | null;
  };
  state: {
    isLoading: boolean;
    isEmpty: boolean;
    isRemoving: boolean;
    error: string | null;
    actionError: string | null;
  };
  actions: {
    onAskRemove: (movement: PartMovement) => void;
    onCancelRemove: () => void;
    onConfirmRemove: () => void;
    onRetry: () => void;
  };
};

/** Quantas linhas do extrato a tela mostra. Mais que isso vira rolagem que ninguém lê. */
const LEDGER_PAGE_SIZE = 100;

/**
 * O EXTRATO de uma peça: o que explica o saldo dela.
 *
 * Excluir uma linha aqui devolve o saldo e refaz a sequência no servidor — por isso a
 * consulta do depósito inteiro é invalidada junto, e não só a desta peça.
 */
export function usePartLedgerModel({ part }: { part: Part }): PartLedgerModel {
  const queryClient = useQueryClient();

  const ledger = mirrorStore(
    createQuery(
      writable({
        queryKey: [...PARTS_QUERY_KEY, 'ledger', part.id],
        queryFn: () => partsApi.movements({ partId: part.id, page: 1, pageSize: LEDGER_PAGE_SIZE }),
      }),
    ),
  );

  const removingStore = writable<PartMovement | null>(null);
  const removing = mirrorStore(removingStore);

  const remove = mirrorStore(
    createMutation({
      mutationFn: (id: number) => partsApi.removeMovement(id),
      onSuccess: async () => {
        removingStore.set(null);
        await queryClient.invalidateQueries({ queryKey: PARTS_QUERY_KEY });
      },
    }),
  );

  return {
    get data() {
      return {
        part,
        movements: ledger.current.data?.items ?? [],
        removing: removing.current,
      };
    },
    get state() {
      const count = ledger.current.data?.items.length ?? 0;

      return {
        isLoading: ledger.current.isPending,
        /* Vazio só é vazio depois que a consulta terminou. */
        isEmpty: ledger.current.isSuccess && count === 0,
        isRemoving: remove.current.isPending,
        error: readError(ledger.current.error),
        actionError: readError(remove.current.error),
      };
    },
    actions: {
      onAskRemove: (movement) => removingStore.set(movement),
      onCancelRemove: () => removingStore.set(null),
      onConfirmRemove: () => {
        const target = removing.current;
        if (!target) return;

        remove.current.mutate(target.id);
      },
      onRetry: () => void ledger.current.refetch(),
    },
  };
}

/**
 * A PEÇA PELO ID — para quem só tem o número dela (a Rastreabilidade, que abre o extrato num
 * diálogo sobre o mapa). O extrato precisa da peça inteira (nome, saldo).
 */
export function usePartByIdModel(id: number): {
  readonly part: Part | null;
  readonly isLoading: boolean;
  readonly error: string | null;
} {
  const part = mirrorStore(
    createQuery(
      writable({
        queryKey: [...PARTS_QUERY_KEY, 'detail', id],
        queryFn: () => partsApi.findById(id),
      }),
    ),
  );

  return {
    get part() {
      return part.current.data ?? null;
    },
    get isLoading() {
      return part.current.isPending;
    },
    get error() {
      return part.current.error ? readError(part.current.error) : null;
    },
  };
}
