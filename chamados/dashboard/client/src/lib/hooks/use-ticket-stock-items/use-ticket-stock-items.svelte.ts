import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import {
  type TicketStockDirection,
  type TicketStockSource,
} from '@template/shared/domain/ticket-stock.util';
import {
  type TicketStockItem,
  ticketStockItemFormSchema,
  type TicketStockItemFormValues,
  type TicketStockOption,
} from '@template/shared/schemas/ticket-stock-item.schema';
import { writable } from 'svelte/store';

import { readError } from '$lib/api/http-client';
import { ticketsApi } from '$lib/api/tickets.api';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';
import { TICKETS_QUERY_KEY } from '$lib/hooks/use-ticket-list/use-ticket-list.svelte';

export type TicketStockField = keyof TicketStockItemFormValues;

export type TicketStockItemsModel = {
  data: {
    /** Os itens DESTA prateleira no chamado. */
    items: TicketStockItem[];
    /** O que pode ser escolhido, com quanto ainda sobra para sair. */
    options: TicketStockOption[];
    values: TicketStockItemFormValues;
    errors: Partial<Record<TicketStockField, string>>;
  };
  state: {
    isLoading: boolean;
    isAdding: boolean;
    /** Qual item está saindo — trava só a linha dele. */
    removingId: number | null;
    error: string | null;
  };
  actions: {
    onChange: (field: TicketStockField, value: string) => void;
    onSubmit: () => void;
    onRemove: (id: number) => void;
  };
};

const EMPTY: TicketStockItemFormValues = { itemId: '', direction: 'out', quantity: '1' };

/** A chave dos itens de estoque de um chamado — o Depósito e a ficha leem a mesma. */
export function ticketStockItemsQueryKey(ticketId: number) {
  return [...TICKETS_QUERY_KEY, ticketId, 'stock-items'] as const;
}

/**
 * OS ITENS DE ESTOQUE de um chamado, numa prateleira — a da área da tela (Infra mexe nas peças
 * da TI, Manutenção nos produtos dela). Como as pessoas vinculadas, é um pedido PRÓPRIO, fora
 * do formulário de dados: adicionar e tirar salvam na hora.
 *
 * O que cabe (saldo, chamado encerrado, quem pode) é o servidor que diz; a recusa aparece
 * embaixo do cartão, sem uma segunda cópia da regra aqui.
 */
export function useTicketStockItemsModel(
  ticketId: number,
  source: TicketStockSource,
): TicketStockItemsModel {
  const queryClient = useQueryClient();

  const items = mirrorStore(
    createQuery(
      writable({
        queryKey: ticketStockItemsQueryKey(ticketId),
        queryFn: () => ticketsApi.stockItems(ticketId),
      }),
    ),
  );

  const options = mirrorStore(
    createQuery(
      writable({
        queryKey: [...TICKETS_QUERY_KEY, 'stock-options', source],
        queryFn: () => ticketsApi.stockOptions(source),
      }),
    ),
  );

  let values = $state<TicketStockItemFormValues>({ ...EMPTY });
  let errors = $state<Partial<Record<TicketStockField, string>>>({});
  let removingId = $state<number | null>(null);

  /* A chave inteira de chamados: o item vira histórico na linha do tempo, e a sobra das opções
     (e o selo do Depósito) muda junto. */
  const refresh = () => queryClient.invalidateQueries({ queryKey: TICKETS_QUERY_KEY });

  const add = mirrorStore(
    createMutation({
      mutationFn: (input: TicketStockItemFormValues) =>
        ticketsApi.addStockItem(ticketId, {
          source,
          itemId: Number(input.itemId),
          direction: input.direction,
          quantity: Number(input.quantity),
        }),
      onSuccess: async () => {
        values = { ...EMPTY, direction: values.direction };
        await refresh();
      },
    }),
  );

  const remove = mirrorStore(
    createMutation({
      mutationFn: (id: number) => ticketsApi.removeStockItem(ticketId, id),
      onSuccess: refresh,
      onSettled: () => {
        removingId = null;
      },
    }),
  );

  return {
    get data() {
      return {
        items: (items.current.data ?? []).filter((item) => item.source === source),
        options: options.current.data ?? [],
        values,
        errors,
      };
    },
    get state() {
      return {
        isLoading: items.current.isPending || options.current.isPending,
        isAdding: add.current.isPending,
        removingId,
        error:
          readError(add.current.error) ??
          readError(remove.current.error) ??
          readError(items.current.error),
      };
    },
    actions: {
      onChange: (field, value) => {
        values = { ...values, [field]: field === 'direction' ? (value as TicketStockDirection) : value };
        errors = { ...errors, [field]: undefined };
        /* Trocar o sentido pode deixar o item escolhido fora da lista (saída só mostra o que
           sobra): começa a escolha de novo. */
        if (field === 'direction') values = { ...values, itemId: '' };
      },
      onSubmit: () => {
        const parsed = ticketStockItemFormSchema.safeParse(values);
        if (!parsed.success) {
          errors = toErrors(parsed.error.issues);
          return;
        }

        errors = {};
        add.current.mutate(parsed.data);
      },
      onRemove: (id) => {
        removingId = id;
        remove.current.mutate(id);
      },
    },
  };
}

/** A primeira mensagem de cada campo — é a que a tela mostra embaixo dele. */
function toErrors(
  issues: readonly { path: (string | number)[]; message: string }[],
): Partial<Record<TicketStockField, string>> {
  const found: Partial<Record<TicketStockField, string>> = {};
  for (const issue of issues) {
    const field = issue.path[0] as TicketStockField;
    found[field] ??= issue.message;
  }

  return found;
}
