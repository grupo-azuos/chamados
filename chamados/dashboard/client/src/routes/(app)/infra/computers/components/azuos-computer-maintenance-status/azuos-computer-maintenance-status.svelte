<script lang="ts" module>
  import type { ComputerListItem } from '@template/shared/schemas/computer.schema';

  /** A mesma leitura de manutenção nos cards e na tabela, sem confundir alerta com chamado. */
  export type AzuosComputerMaintenanceStatusProps = {
    data: { computer: Pick<ComputerListItem,
      'preventiveStatus' | 'lastPreventiveAt' | 'activeAlerts' | 'isArchived' | 'disposedAt'> };
  };
</script>

<script lang="ts">
  import {
    daysUntilPreventive,
    nextPreventiveAt,
    preventiveCountdownLabel,
    preventiveStatusTone,
  } from '@template/shared/domain/maintenance.util';

  import StatusBadge from '$lib/components/azuos-status-badge/azuos-status-badge.svelte';
  import { formatDate } from '$lib/utils/format-date';

  let { data }: AzuosComputerMaintenanceStatusProps = $props();
  const computer = $derived(data.computer);
  const inactive = $derived(computer.isArchived || Boolean(computer.disposedAt));
  /* O prazo sai da mesma data que decide o status, para os dois nunca se contradizerem. */
  const daysLeft = $derived(daysUntilPreventive(computer.lastPreventiveAt));
</script>

<div class="flex min-w-0 flex-col items-start gap-1.5">
  {#if inactive}
    <span class="text-ink-500 text-xs">Fora de uso</span>
  {:else}
    {#if computer.activeAlerts > 0}
      <StatusBadge
        data={{ label: computer.activeAlerts === 1 ? '1 alerta crítico ativo' : `${computer.activeAlerts} alertas críticos ativos` }}
        ui={{ tone: 'danger', size: 'sm' }}
      />
    {/if}
    {#if computer.preventiveStatus === 'due' || computer.preventiveStatus === 'never'}
      <StatusBadge
        data={{ label: computer.preventiveStatus === 'due' ? 'Preventiva vencida' : 'Preventiva sem registro' }}
        ui={{ tone: preventiveStatusTone(computer.preventiveStatus), size: 'sm' }}
      />
      {#if computer.preventiveStatus === 'due' && computer.lastPreventiveAt}
        <span class="text-ink-500 text-xs break-words">
          Última manutenção: {formatDate(computer.lastPreventiveAt)}{#if daysLeft !== null}
            · {preventiveCountdownLabel(daysLeft)}{/if}
        </span>
      {/if}
    {:else if computer.preventiveStatus === 'ok'}
      <span class="text-ink-500 text-xs">Preventiva em dia</span>
      {#if daysLeft !== null}
        <span class="text-ink-500 text-xs break-words">
          Próxima em {formatDate(nextPreventiveAt(computer.lastPreventiveAt))} · {preventiveCountdownLabel(daysLeft)}
        </span>
      {/if}
    {:else}
      <span class="text-ink-500 text-xs">Preventiva não informada</span>
    {/if}
  {/if}
</div>
