<!--
  @component
  OS ITENS DE ESTOQUE na ficha do chamado — o que o atendimento tira do depósito (saída) ou devolve
  a ele (entrada), POR MÁQUINA: 1 máquina para vários itens, cada linha "Computador 01 → Monitor 24
  ×2, Teclado ×1" (o que não tem máquina fica em "Sem máquina"). "Vincular itens" abre o diálogo de
  dois lados (a máquina de um, os itens do outro).

  O item fica RESERVADO enquanto o chamado está aberto: o saldo do depósito só anda no encerramento.
  Com o chamado encerrado, a lista vira só leitura — para mexer, reabre-se.

  Função pura de props. `data` leva os itens; `ui`, o nome do depósito e `isHeaderHidden`; `state`,
  encerrado, carregamento, remoção e erro; `actions`, abrir o diálogo e tirar um item.
-->
<script lang="ts" module>
  import { ticketStockDirectionLabel } from '@template/shared/domain/ticket-stock.util';
  import { type TicketStockItem } from '@template/shared/schemas/ticket-stock-item.schema';

  export type AzuosTicketStockItemsCardProps = {
    data: { items: TicketStockItem[] };
    ui?: {
      /** O nome do depósito na tela — "Depósito da TI", "Depósito da Manutenção". */
      shelfLabel?: string;
      /** Sem o título: quando o cartão mora dentro de uma seção que já tem o nome dele. */
      isHeaderHidden?: boolean;
    };
    state?: {
      isClosed?: boolean;
      isLoading?: boolean;
      removingId?: number | null;
      error?: string | null;
    };
    actions: {
      /** Abre "Vincular itens". */
      onOpenLink: () => void;
      onRemove: (id: number) => void;
    };
  };
</script>

<script lang="ts">
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
  import Link2 from '@lucide/svelte/icons/link-2';
  import Monitor from '@lucide/svelte/icons/monitor';
  import XIcon from '@lucide/svelte/icons/x';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import ErrorState from '$lib/components/azuos-error-state/azuos-error-state.svelte';
  import { cardToneClasses } from '$lib/utils/card-tone.util';
  import { cn } from '$lib/utils/cn';
  import { groupByMachine } from '$lib/utils/ticket-stock-link.util';

  let { data, ui, state: cardState, actions }: AzuosTicketStockItemsCardProps = $props();

  const groups = $derived(groupByMachine(data.items));
</script>

<div class={ui?.isHeaderHidden ? 'flex flex-col gap-3' : 'border-border/70 flex flex-col gap-3 border-t pt-4'}>
  <div class="flex flex-wrap items-start justify-between gap-2">
    <div>
      {#if !ui?.isHeaderHidden}
        <p class="text-ink-700 text-sm font-medium">Itens do estoque</p>
      {/if}
      <p class="text-muted-foreground text-xs">
        O que sai ou volta para o {ui?.shelfLabel ?? 'depósito'}, por máquina. O saldo só muda quando
        o chamado for encerrado.
      </p>
    </div>
    {#if !cardState?.isClosed}
      <ActionButton data={{ label: 'Vincular itens' }} ui={{ variant: 'secondary', icon: Link2 }} actions={{ onClick: actions.onOpenLink }} />
    {/if}
  </div>

  {#if cardState?.isLoading}
    <p class="text-muted-foreground text-xs">Carregando os itens…</p>
  {:else if data.items.length === 0}
    <p class="text-muted-foreground/70 text-xs">Nenhum item do estoque neste chamado.</p>
  {:else}
    <!-- Uma linha por máquina: ela à esquerda, a seta, e os itens dela à direita (1 para vários). -->
    <ul class="divide-border flex flex-col divide-y" aria-label="Itens por máquina">
      {#each groups as group (group.machineId)}
        <li class="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-3">
          <span class="flex min-w-0 shrink-0 items-center gap-2 sm:w-56">
            <span aria-hidden="true" class={cn('rounded-icon inline-flex size-7 shrink-0 items-center justify-center', cardToneClasses('blue').dot)}>
              <Monitor class="size-3.5" />
            </span>
            <span class="text-foreground truncate text-sm font-semibold">{group.machineName ?? 'Sem máquina'}</span>
          </span>
          <ArrowRight class="text-muted-foreground hidden size-4 shrink-0 sm:block" aria-hidden="true" />
          <ul class="flex min-w-0 flex-1 flex-wrap gap-2" aria-label={`Itens de ${group.machineName ?? 'sem máquina'}`}>
            {#each group.items as item (item.id)}
              <li class="rounded-chip bg-muted flex items-center gap-1.5 py-1 pr-1 pl-3 text-sm">
                <span
                  aria-hidden="true"
                  class={cn('size-2 shrink-0 rounded-full', cardToneClasses(item.direction === 'out' ? 'yellow' : 'green').swatch)}
                ></span>
                <span class="text-foreground font-medium">{item.name}</span>
                <span class="text-muted-foreground tabular-nums">×{item.quantity}</span>
                <span class="text-muted-foreground text-xs">
                  · {ticketStockDirectionLabel(item.direction)} · {item.settledAt ? 'baixado' : 'reservado'}
                </span>
                {#if !cardState?.isClosed}
                  <ActionButton
                    data={{ label: `Tirar ${item.name} do chamado` }}
                    ui={{ variant: 'ghost', size: 'sm', icon: XIcon, isIconOnly: true }}
                    state={{ isDisabled: cardState?.removingId === item.id, isLoading: cardState?.removingId === item.id }}
                    actions={{ onClick: () => actions.onRemove(item.id) }}
                  />
                {/if}
              </li>
            {/each}
          </ul>
        </li>
      {/each}
    </ul>
  {/if}

  {#if cardState?.isClosed}
    <p class="text-muted-foreground text-xs">Chamado encerrado: para tirar ou colocar itens, reabra o chamado.</p>
  {/if}

  {#if cardState?.error}
    <ErrorState data={{ message: cardState.error }} ui={{ variant: 'inline' }} />
  {/if}
</div>
