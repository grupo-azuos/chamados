import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { type InventoryItemEventType } from '@template/shared/domain/inventory-item-event.util';
import {
  type CreateInventoryItemEventInput,
  type InventoryItemEvent,
} from '@template/shared/schemas/inventory-item-event.schema';

import { readError } from '$lib/api/http-client';
import { inventoryItemsApi } from '$lib/api/inventory-items.api';
import { INVENTORY_QUERY_KEY } from '$lib/hooks/use-inventory-list/use-inventory-list.svelte';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';

export const inventoryItemEventsQueryKey = (itemId: number) => [
  ...INVENTORY_QUERY_KEY,
  itemId,
  'events',
];

export type InventoryItemTimelineModel = {
  data: {
    events: InventoryItemEvent[];
    type: InventoryItemEventType;
    description: string;
  };
  state: {
    isLoading: boolean;
    isSubmitting: boolean;
    error: string | null;
    formError: string | null;
  };
  actions: {
    onTypeChange: (type: InventoryItemEventType) => void;
    onDescriptionChange: (description: string) => void;
    onSubmit: () => Promise<boolean>;
  };
};

export function useInventoryItemTimelineModel(itemId: number | null): InventoryItemTimelineModel {
  const queryClient = useQueryClient();

  const eventsQuery = mirrorStore(
    createQuery({
      queryKey: itemId ? inventoryItemEventsQueryKey(itemId) : ['disabled-item-events'],
      queryFn: () => (itemId ? inventoryItemsApi.events(itemId) : Promise.resolve([])),
      enabled: Boolean(itemId),
    }),
  );

  let type = $state<InventoryItemEventType>('observacao');
  let description = $state('');
  let formError = $state<string | null>(null);

  const addMutation = mirrorStore(
    createMutation({
      mutationFn: (body: CreateInventoryItemEventInput) => {
        if (!itemId) throw new Error('Produto inválido');
        return inventoryItemsApi.addEvent(itemId, body);
      },
      onSuccess: () => {
        if (itemId) {
          void queryClient.invalidateQueries({ queryKey: inventoryItemEventsQueryKey(itemId) });
        }
        description = '';
        formError = null;
      },
    }),
  );

  async function handleSubmit(): Promise<boolean> {
    const trimmed = description.trim();
    if (!trimmed) {
      formError = 'A descrição da ocorrência não pode ficar vazia.';
      return false;
    }
    formError = null;

    try {
      await addMutation.current.mutateAsync({ type, description: trimmed });
      return true;
    } catch (err) {
      formError = readError(err);
      return false;
    }
  }

  return {
    data: {
      get events() {
        return eventsQuery.current.data ?? [];
      },
      get type() {
        return type;
      },
      get description() {
        return description;
      },
    },
    state: {
      get isLoading() {
        return eventsQuery.current.isLoading;
      },
      get isSubmitting() {
        return addMutation.current.isPending;
      },
      get error() {
        return eventsQuery.current.error ? readError(eventsQuery.current.error) : null;
      },
      get formError() {
        return formError;
      },
    },
    actions: {
      onTypeChange: (nextType) => {
        type = nextType;
      },
      onDescriptionChange: (nextDesc) => {
        description = nextDesc;
        if (formError) formError = null;
      },
      onSubmit: handleSubmit,
    },
  };
}
