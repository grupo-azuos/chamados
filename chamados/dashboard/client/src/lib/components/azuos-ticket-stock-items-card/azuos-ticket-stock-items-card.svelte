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
  import { disposalReasonLabel } from '@template/shared/domain/inventory-stock.util';

  /* O selo de cada sentido: a saída no amarelo, a entrada no verde, o descarte no vermelho. */
  const DIRECTION_TONES = { out: 'warning', in: 'success', disposal: 'danger' } as const;
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
  import Link2 from '@lucide/svelte/icons/link-2';
  import Monitor from '@lucide/svelte/icons/monitor';
  import XIcon from '@lucide/svelte/icons/x';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import ErrorState from '$lib/components/azuos-error-state/azuos-error-state.svelte';
  import { Skeleton } from '$lib/components/azuos-skeleton/azuos-skeleton';
  import StatusBadge from '$lib/components/azuos-status-badge/azuos-status-badge.svelte';
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
    <div class="flex flex-col gap-2" aria-busy="true" aria-label="Carregando os itens">
      <Skeleton class="h-8 w-full" />
      <Skeleton class="h-8 w-2/3" />
    </div>
  {:else if data.items.length === 0}
    <p class="text-muted-foreground/70 text-xs">Nenhum item do estoque neste chamado.</p>
  {:else}
    <!-- Uma linha por máquina: ela à esquerda, a seta, e os itens dela à direita (1 para vários). -->
    <ul class="divide-border flex flex-col divide-y" aria-label="Itens por máquina">
      {#each groups as group (group.machineId)}
        <li class="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-3">
          <span class="flex min-w-0 shrink-0 items-center gap-2 sm:w-56">
            <Monitor class="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
            <span class="text-foreground truncate text-sm font-semibold">{group.machineName ?? 'Sem máquina'}</span>
          </span>
          <ArrowRight class="text-muted-foreground hidden size-4 shrink-0 sm:block" aria-hidden="true" />
          <ul class="flex min-w-0 flex-1 flex-col gap-1" aria-label={`Itens de ${group.machineName ?? 'sem máquina'}`}>
            {#each group.items as item (item.id)}
              <!-- Uma linha por item: o sentido no selo da casa, o nome, a quantidade e a situação. -->
              <li class="flex flex-wrap items-center gap-1.5 text-sm">
                <StatusBadge
                  data={{
                    label: `${ticketStockDirectionLabel(item.direction)}${item.reason ? ` (${disposalReasonLabel(item.reason).toLowerCase()})` : ''}`,
                  }}
                  ui={{ tone: DIRECTION_TONES[item.direction], size: 'sm' }}
                />
                <span class="text-foreground font-medium">{item.name}</span>
                <span class="text-muted-foreground tabular-nums">×{item.quantity}</span>
                <span class="text-muted-foreground text-xs">· {item.settledAt ? 'baixado' : 'reservado'}</span>
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
