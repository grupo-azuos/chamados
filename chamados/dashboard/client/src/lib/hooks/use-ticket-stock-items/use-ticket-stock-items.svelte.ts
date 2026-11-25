import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import {
  type TicketStockDirection,
  type TicketStockSource,
} from '@template/shared/domain/ticket-stock.util';
import {
  type TicketStockItem,
  type TicketStockOption,
} from '@template/shared/schemas/ticket-stock-item.schema';
import { writable } from 'svelte/store';

import { readError } from '$lib/api/http-client';
import { ticketsApi } from '$lib/api/tickets.api';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';
import { TICKETS_QUERY_KEY } from '$lib/hooks/use-ticket-list/use-ticket-list.svelte';
import {
  EMPTY_NEW_ITEM,
  linkOptions,
  newItemErrors,
  selectionErrors,
  type TicketStockNewItemValues,
  type TicketStockSelection,
} from '$lib/utils/ticket-stock-link.util';
import { inventoryItemsApi } from '$lib/api/inventory-items.api';
import { partsApi } from '$lib/api/parts.api';
import { type DisposalReason } from '@template/shared/domain/inventory-stock.util';
import { type InventoryCategory, type InventoryUnit } from '@template/shared/domain/inventory-catalog.util';
import { type PartCategory, type PartCondition } from '@template/shared/domain/part-catalog.util';

/** O rascunho do diálogo "Vincular itens": a máquina, o sentido, a busca e o que foi marcado. */
export type TicketStockLinkDraft = {
  isOpen: boolean;
  machineId: string;
  direction: TicketStockDirection;
  search: string;
  selection: TicketStockSelection;
  errors: Record<string, string>;
  /** O motivo do descarte; vazio fora do descarte. */
  reason: string;
  reasonError: string | null;
  /** O cadastro de item na hora. */
  newItem: { isOpen: boolean; values: TicketStockNewItemValues; errors: Partial<Record<keyof TicketStockNewItemValues, string>> };
};

export type TicketStockItemsModel = {
  data: {
    /** Os itens DESTA prateleira no chamado. */
    items: TicketStockItem[];
    /** O que pode ser escolhido, com quanto ainda sobra para sair. */
    options: TicketStockOption[];
    link: TicketStockLinkDraft & { options: TicketStockOption[] };
  };
  state: {
    isLoading: boolean;
    isLinking: boolean;
    /** Qual item está saindo — trava só o dele. */
    removingId: number | null;
    error: string | null;
    linkError: string | null;
    isCreating: boolean;
    createError: string | null;
  };
  actions: {
    onRemove: (id: number) => void;
    link: {
      /** Abre o diálogo já na máquina dada (a primeira do chamado); vazio é "sem máquina". */
      onOpen: (machineId: string) => void;
      onClose: () => void;
      onMachineChange: (machineId: string) => void;
      onDirectionChange: (direction: TicketStockDirection) => void;
      onSearch: (search: string) => void;
      onToggle: (itemId: string) => void;
      onQuantityChange: (itemId: string, value: string) => void;
      onApply: () => void;
      onReasonChange: (reason: string) => void;
      newItem: {
        onOpen: () => void;
        onChange: (field: keyof TicketStockNewItemValues, value: string) => void;
        onSave: () => void;
        onCancel: () => void;
      };
    };
  };
};

const CLOSED: TicketStockLinkDraft = {
  isOpen: false,
  machineId: '',
  direction: 'out',
  search: '',
  selection: {},
  errors: {},
  reason: '',
  reasonError: null,
  newItem: { isOpen: false, values: { ...EMPTY_NEW_ITEM }, errors: {} },
};

/** A chave dos itens de estoque de um chamado — o Depósito e a ficha leem a mesma. */
export function ticketStockItemsQueryKey(ticketId: number) {
  return [...TICKETS_QUERY_KEY, ticketId, 'stock-items'] as const;
}

/** Marca ou desmarca um item; marcado nasce com 1. */
export function toggleSelection(
  selection: TicketStockSelection,
  itemId: string,
): TicketStockSelection {
  if (!(itemId in selection)) return { ...selection, [itemId]: '1' };
  const { [itemId]: _removed, ...rest } = selection;

  return rest;
}

/**
 * OS ITENS DE ESTOQUE de um chamado, numa prateleira — a da área da tela (Infra mexe nas peças
 * da TI, Manutenção nos produtos dela), POR MÁQUINA: o diálogo "Vincular itens" escolhe a máquina
 * e marca vários itens, e grava todos de uma vez. Tirar um item salva na hora.
 *
 * O que cabe (saldo, chamado encerrado, quem pode) é o servidor que diz; aqui só a conta óbvia da
 * quantidade, para a recusa não chegar depois de metade gravada.
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

  let draft = $state<TicketStockLinkDraft>({ ...CLOSED });
  let removingId = $state<number | null>(null);

  /* A chave inteira de chamados: o item vira histórico na linha do tempo, e a sobra das opções
     (e o selo do Depósito) muda junto. */
  const refresh = () => queryClient.invalidateQueries({ queryKey: TICKETS_QUERY_KEY });

  const link = mirrorStore(
    createMutation({
      mutationFn: async (input: TicketStockLinkDraft) => {
        for (const [itemId, quantity] of Object.entries(input.selection)) {
          await ticketsApi.addStockItem(ticketId, {
            source,
            itemId: Number(itemId),
            direction: input.direction,
            quantity: Number(quantity),
            ...(input.direction === 'disposal' ? { reason: input.reason as DisposalReason } : {}),
            /* Vazio: sem máquina (ou o chamado tem uma só, e o servidor sabe qual). */
            ...(input.machineId ? { computerId: Number(input.machineId) } : {}),
          });
        }
      },
      onSuccess: () => {
        draft = { ...CLOSED };
      },
      onSettled: refresh,
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

  /* O item novo nasce no depósito com a quantidade informada (uma entrada) e volta marcado. */
  const create = mirrorStore(
    createMutation({
      mutationFn: (values: TicketStockNewItemValues) => createShelfItem(source, values),
      onSuccess: async (itemId: number) => {
        await queryClient.invalidateQueries({ queryKey: [...TICKETS_QUERY_KEY, 'stock-options', source] });
        draft = {
          ...draft,
          search: '',
          selection: { ...draft.selection, [String(itemId)]: '1' },
          newItem: { isOpen: false, values: { ...EMPTY_NEW_ITEM }, errors: {} },
        };
      },
    }),
  );

  const allOptions = $derived(options.current.data ?? []);

  return {
    get data() {
      return {
        items: (items.current.data ?? []).filter((item) => item.source === source),
        options: allOptions,
        link: { ...draft, options: linkOptions(allOptions, draft.direction, draft.search) },
      };
    },
    get state() {
      return {
        isLoading: items.current.isPending || options.current.isPending,
        isLinking: link.current.isPending,
        removingId,
        error: readError(remove.current.error) ?? readError(items.current.error),
        linkError: readError(link.current.error),
        isCreating: create.current.isPending,
        createError: readError(create.current.error),
      };
    },
    actions: {
      onRemove: (id) => {
        removingId = id;
        remove.current.mutate(id);
      },
      link: {
        onOpen: (machineId) => {
          link.current.reset();
          draft = { ...CLOSED, isOpen: true, machineId };
        },
        onClose: () => (draft = { ...CLOSED }),
        onMachineChange: (machineId) => (draft = { ...draft, machineId }),
        /* Trocar o sentido muda o que dá para escolher (a saída só mostra o que sobra): começa de novo. */
        onDirectionChange: (direction) =>
          (draft = { ...draft, direction, selection: {}, errors: {}, reason: '', reasonError: null }),
        onSearch: (search) => (draft = { ...draft, search }),
        onToggle: (itemId) =>
          (draft = { ...draft, selection: toggleSelection(draft.selection, itemId), errors: {} }),
        onQuantityChange: (itemId, value) =>
          (draft = { ...draft, selection: { ...draft.selection, [itemId]: value }, errors: {} }),
        onApply: () => {
          const errors = selectionErrors(draft.selection, allOptions, draft.direction);
          const reasonError =
            draft.direction === 'disposal' && !draft.reason ? 'Escolha o motivo do descarte' : null;
          draft = { ...draft, errors, reasonError };
          if (Object.keys(errors).length || reasonError || !Object.keys(draft.selection).length) return;
          link.current.mutate(draft);
        },
        onReasonChange: (reason) => (draft = { ...draft, reason, reasonError: null }),
        newItem: {
          onOpen: () => {
            create.current.reset();
            draft = {
              ...draft,
              newItem: { isOpen: true, values: { ...EMPTY_NEW_ITEM, name: draft.search.trim() }, errors: {} },
            };
          },
          onChange: (field, value) =>
            (draft = {
              ...draft,
              newItem: { ...draft.newItem, values: { ...draft.newItem.values, [field]: value }, errors: {} },
            }),
          onSave: () => {
            const errors = newItemErrors(draft.newItem.values);
            draft = { ...draft, newItem: { ...draft.newItem, errors } };
            if (Object.keys(errors).length) return;
            create.current.mutate(draft.newItem.values);
          },
          onCancel: () =>
            (draft = { ...draft, newItem: { isOpen: false, values: { ...EMPTY_NEW_ITEM }, errors: {} } }),
        },
      },
    },
  };
}

/**
 * Cadastra o item no depósito da área e devolve o id. A peça da TI nasce com a quantidade inicial
 * (o cadastro já registra a entrada); o produto da Manutenção nasce e recebe a entrada logo depois.
 */
export async function createShelfItem(
  source: TicketStockSource,
  values: TicketStockNewItemValues,
): Promise<number> {
  const name = values.name.trim();
  const quantity = Number(values.quantity);
  if (source === 'parts') {
    const part = await partsApi.create({
      name,
      category: values.category as PartCategory,
      condition: values.condition as PartCondition,
      initialQuantity: quantity,
    });
    return part.id;
  }

  const item = await inventoryItemsApi.create(
    {
      name,
      category: values.category as InventoryCategory,
      unit: values.unit as InventoryUnit,
      location: '',
      department: '',
      userId: '',
      userName: '',
      code: '',
      note: '',
    },
    null,
  );
  await inventoryItemsApi.createMovement(item.id, { type: 'in', quantity, reason: null, note: 'Cadastrado num chamado' });

  return item.id;
}

