<!--
  @component
  OS CHAMADOS VINCULADOS na ficha do chamado.

  Permite relacionar chamados entre si (relação N:N). Exibe a lista dos chamados já vinculados com
  link direto e permite buscar por id, protocolo ou assunto para vincular novos.

  `data` leva as relações, o termo e os resultados da busca e o chamado atual; `ui.isHeaderHidden`
  tira o título quando o cartão mora numa seção que já tem o nome dele; `state`, carregamento,
  busca, inclusão, remoção e erro; `actions`, buscar, vincular e desvincular.
-->
<script lang="ts" module>
  import {
    type RelatedTicketSummary,
    type TicketRelation,
  } from '@template/shared/schemas/ticket-relation.schema';

  export type AzuosTicketRelationsCardProps = {
    data: {
      relations: TicketRelation[];
      searchTerm?: string;
      searchResults?: RelatedTicketSummary[];
      currentTicketId?: number;
    };
    /** Sem o título: quando o cartão mora dentro de uma seção que já tem o nome dele. */
    ui?: { isHeaderHidden?: boolean };
    state?: {
      isLoading?: boolean;
      isSearching?: boolean;
      isAdding?: boolean;
      removingId?: number | null;
      error?: string | null;
    };
    actions: {
      onSearchChange: (search: string) => void;
      onAddRelation: (relatedTicketId: number) => void;
      onRemoveRelation: (relatedTicketId: number) => void;
    };
  };
</script>

<script lang="ts">
  import Plus from '@lucide/svelte/icons/plus';
  import Search from '@lucide/svelte/icons/search';
  import Trash2 from '@lucide/svelte/icons/trash-2';

  import { ticketAreaLabel } from '@template/shared/domain/ticket-catalog.util';
  import {
    ticketStatusLabel,
    ticketStatusTone,
  } from '@template/shared/domain/ticket-status.util';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import ErrorState from '$lib/components/azuos-error-state/azuos-error-state.svelte';
  import InputGroup from '$lib/components/azuos-input-group/azuos-input-group.svelte';
  import { Skeleton } from '$lib/components/azuos-skeleton/azuos-skeleton';
  import StatusBadge from '$lib/components/azuos-status-badge/azuos-status-badge.svelte';

  let { data, ui, state: cardState, actions }: AzuosTicketRelationsCardProps = $props();

  // svelte-ignore state_referenced_locally
  let inputValue = $state(data.searchTerm ?? '');

  $effect(() => {
    if (data.searchTerm !== undefined && data.searchTerm !== inputValue) {
      inputValue = data.searchTerm;
    }
  });

  function handleInputChange(value: string) {
    inputValue = value;
    actions.onSearchChange(value);
  }

  function handleLink(relatedId: number) {
    actions.onAddRelation(relatedId);
    inputValue = '';
  }

  function ticketHref(summary: RelatedTicketSummary): string {
    const section =
      summary.area === 'sistema'
        ? 'system'
        : summary.area === 'manutencao'
          ? 'maintenance'
          : 'infra';
    return `/${section}/tickets/${summary.id}`;
  }
</script>

<!-- O protocolo, a área e a situação de um chamado — a mesma linha na busca e na lista. -->
{#snippet summaryLine(item: RelatedTicketSummary)}
  <div class="flex flex-wrap items-center gap-1.5 text-xs">
    <span class="text-foreground font-mono font-semibold">{item.protocol}</span>
    <StatusBadge data={{ label: ticketAreaLabel(item.area) }} ui={{ tone: 'neutral', size: 'sm' }} />
    <StatusBadge
      data={{ label: ticketStatusLabel(item.status) }}
      ui={{ tone: ticketStatusTone(item.status), size: 'sm' }}
    />
  </div>
  <p class="text-muted-foreground truncate text-xs">{item.description}</p>
{/snippet}

<div class={ui?.isHeaderHidden ? 'flex flex-col gap-3' : 'border-border flex flex-col gap-3 border-t pt-4'}>
  {#if ui?.isHeaderHidden}
    <p class="text-muted-foreground text-xs">Relacione chamados entre si para acompanhamento conjunto.</p>
  {:else}
    <div>
      <p class="text-ink-700 text-sm font-medium">Chamados vinculados</p>
      <p class="text-muted-foreground text-xs">
        Relacione chamados entre si para acompanhamento conjunto.
      </p>
    </div>
  {/if}

  <!-- A busca é o campo da casa, com a lupa colada na frente. -->
  <div class="flex flex-col gap-2">
    <InputGroup
      data={{
        label: 'Buscar chamado para vincular',
        name: 'relatedTicketSearch',
        value: inputValue,
        placeholder: 'ID, protocolo ou assunto',
      }}
      state={{ isDisabled: cardState?.isAdding }}
      actions={{ onChange: handleInputChange }}
    >
      {#snippet prefix()}
        <Search class="text-muted-foreground size-4" aria-hidden="true" />
      {/snippet}
    </InputGroup>

    {#if cardState?.isSearching}
      <div class="flex flex-col gap-2" aria-busy="true" aria-label="Buscando chamados">
        <Skeleton class="h-4 w-2/3" />
        <Skeleton class="h-4 w-1/2" />
      </div>
    {:else if data.searchResults && data.searchResults.length > 0}
      <ul class="divide-border flex max-h-48 flex-col divide-y overflow-y-auto" aria-label="Resultados da busca de chamados">
        {#each data.searchResults as item (item.id)}
          <li class="hover:bg-hover-veil rounded-control flex items-center justify-between gap-2 px-2 py-2">
            <div class="flex min-w-0 flex-1 flex-col gap-0.5">
              {@render summaryLine(item)}
            </div>
            <ActionButton
              data={{ label: 'Vincular' }}
              ui={{ variant: 'secondary', size: 'sm', icon: Plus }}
              state={{ isLoading: cardState?.isAdding }}
              actions={{ onClick: () => handleLink(item.id) }}
            />
          </li>
        {/each}
      </ul>
    {:else if inputValue.trim().length > 0 && !cardState?.isSearching}
      <p class="text-muted-foreground py-1 text-center text-xs">Nenhum chamado encontrado.</p>
    {/if}
  </div>

  {#if cardState?.error}
    <ErrorState data={{ message: cardState.error }} ui={{ variant: 'inline' }} />
  {/if}

  {#if cardState?.isLoading}
    <div class="flex flex-col gap-2" aria-busy="true" aria-label="Carregando vínculos">
      <Skeleton class="h-10 w-full" />
      <Skeleton class="h-10 w-full" />
    </div>
  {:else if data.relations.length === 0}
    <p class="text-muted-foreground text-xs">Nenhum chamado vinculado a este ainda.</p>
  {:else}
    <ul class="divide-border flex flex-col divide-y" aria-label="Lista de chamados vinculados">
      {#each data.relations as relation (relation.id)}
        {@const target = relation.relatedTicket}
        <li class="hover:bg-hover-veil rounded-control flex items-center justify-between gap-2 px-2 py-2">
          <a
            href={ticketHref(target)}
            class="flex min-w-0 flex-1 flex-col gap-0.5"
            aria-label={`Abrir chamado ${target.protocol}`}
          >
            {@render summaryLine(target)}
          </a>
          <ActionButton
            data={{ label: `Desvincular chamado ${target.protocol}` }}
            ui={{ variant: 'ghost', size: 'sm', icon: Trash2, isIconOnly: true }}
            state={{ isLoading: cardState?.removingId === relation.relatedTicketId }}
            actions={{ onClick: () => actions.onRemoveRelation(relation.relatedTicketId) }}
          />
        </li>
      {/each}
    </ul>
  {/if}
</div>
