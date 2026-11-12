<script lang="ts" module>
  import {
    type RelatedTicketSummary,
    type TicketRelation,
  } from '@template/shared/schemas/ticket-relation.schema';

  /**
   * OS CHAMADOS VINCULADOS na ficha do chamado.
   *
   * Permite relacionar chamados entre si (relação N:N). Exibe a lista dos chamados
   * já vinculados com link direto e permite buscar por id/protocolo ou texto para vincular novos.
   */
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
  import ExternalLink from '@lucide/svelte/icons/external-link';
  import Link2 from '@lucide/svelte/icons/link-2';
  import Plus from '@lucide/svelte/icons/plus';
  import Search from '@lucide/svelte/icons/search';
  import Trash2 from '@lucide/svelte/icons/trash-2';

  import { ticketAreaLabel } from '@template/shared/domain/ticket-catalog.util';
  import {
    ticketStatusLabel,
    ticketStatusTone,
  } from '@template/shared/domain/ticket-status.util';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import StatusBadge from '$lib/components/azuos-status-badge/azuos-status-badge.svelte';

  let { data, ui, state: cardState, actions }: AzuosTicketRelationsCardProps = $props();

  // svelte-ignore state_referenced_locally
  let inputValue = $state(data.searchTerm ?? '');

  $effect(() => {
    if (data.searchTerm !== undefined && data.searchTerm !== inputValue) {
      inputValue = data.searchTerm;
    }
  });

  function handleInputChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
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

<div class={ui?.isHeaderHidden ? 'flex flex-col gap-3' : 'border-border flex flex-col gap-3 border-t pt-4'}>
  {#if ui?.isHeaderHidden}
    <p class="text-muted-foreground text-xs">Relacione chamados entre si para acompanhamento conjunto.</p>
  {:else}
    <div class="flex items-center gap-2">
      <Link2 class="text-primary size-4" aria-hidden="true" />
      <div>
        <p class="text-ink-700 text-sm font-medium">Chamados vinculados</p>
        <p class="text-muted-foreground text-xs">
          Relacione chamados entre si para acompanhamento conjunto.
        </p>
      </div>
    </div>
  {/if}

  <!-- Campo de busca de chamados para vincular -->
  <div class="flex flex-col gap-2">
    <div class="relative flex items-center">
      <Search class="text-muted-foreground pointer-events-none absolute left-3 size-4" aria-hidden="true" />
      <input
        type="search"
        value={inputValue}
        oninput={handleInputChange}
        placeholder="Buscar chamado por ID, protocolo ou assunto…"
        aria-label="Buscar chamado para vincular"
        disabled={cardState?.isAdding}
        class="border-border bg-card text-foreground placeholder:text-muted-foreground focus:ring-primary h-10 w-full rounded-control border pr-3 pl-9 text-xs shadow-xs focus:ring-1 focus:outline-none disabled:bg-muted disabled:text-muted-foreground"
      />
    </div>

    <!-- Resultados da busca -->
    {#if cardState?.isSearching}
      <p class="text-muted-foreground py-1 text-center text-xs">Buscando chamados…</p>
    {:else if data.searchResults && data.searchResults.length > 0}
      <ul
        class="border-border bg-card rounded-box flex max-h-48 flex-col gap-1 overflow-y-auto border p-1 shadow-sm"
        aria-label="Resultados da busca de chamados"
      >
        {#each data.searchResults as item (item.id)}
          <li
            class="hover:bg-muted flex items-center justify-between gap-2 rounded-control p-2 transition-colors"
          >
            <div class="flex min-w-0 flex-1 flex-col gap-0.5">
              <div class="flex items-center gap-1.5 text-xs">
                <span class="font-mono font-semibold text-primary">{item.protocol}</span>
                <span
                  class="rounded-chip bg-muted text-ink-700 shrink-0 px-1.5 py-0.5 text-xs font-medium"
                >
                  {ticketAreaLabel(item.area)}
                </span>
                <StatusBadge
                  data={{ label: ticketStatusLabel(item.status) }}
                  ui={{ tone: ticketStatusTone(item.status) }}
                />
              </div>
              <p class="text-ink-700 truncate text-xs" title={item.description}>
                {item.description}
              </p>
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

  <!-- Mensagem de erro -->
  {#if cardState?.error}
    <p role="alert" class="text-destructive text-xs">{cardState.error}</p>
  {/if}

  <!-- Lista de chamados vinculados -->
  {#if cardState?.isLoading}
    <p class="text-muted-foreground py-2 text-center text-xs">Carregando vínculos…</p>
  {:else if data.relations.length === 0}
    <p class="text-muted-foreground text-xs">Nenhum chamado vinculado a este ainda.</p>
  {:else}
    <ul class="flex flex-col gap-2" aria-label="Lista de chamados vinculados">
      {#each data.relations as relation (relation.id)}
        {@const target = relation.relatedTicket}
        <li
          class="border-border bg-card rounded-control flex items-center justify-between gap-2 border p-2 shadow-xs"
        >
          <a
            href={ticketHref(target)}
            class="hover:text-primary flex min-w-0 flex-1 flex-col gap-0.5 transition-colors"
            title={`Abrir chamado ${target.protocol}`}
          >
            <div class="flex items-center gap-1.5 text-xs">
              <span class="font-mono font-semibold text-primary">{target.protocol}</span>
              <span
                class="rounded-chip bg-muted text-ink-700 shrink-0 px-1.5 py-0.5 text-xs font-medium"
              >
                {ticketAreaLabel(target.area)}
              </span>
              <StatusBadge
                data={{ label: ticketStatusLabel(target.status) }}
                ui={{ tone: ticketStatusTone(target.status) }}
              />
              <ExternalLink class="text-muted-foreground size-3 shrink-0" aria-hidden="true" />
            </div>
            <p class="text-ink-700 truncate text-xs" title={target.description}>
              {target.description}
            </p>
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
