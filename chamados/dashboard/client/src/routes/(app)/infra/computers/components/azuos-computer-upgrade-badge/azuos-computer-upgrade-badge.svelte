<!--
  @component
  O AVISO DE UPGRADE da máquina — o selo âmbar "Upgrade" e, no balão, o porquê: pouca memória,
  pouco espaço em disco, processador antigo, cada um com o número que o sustenta.

  É ATENÇÃO, e não emergência: a máquina funciona, só está aquém. Por isso não pisca e não entra
  no selo vermelho dos alertas (`AzuosComputerAlertBadge`) — piscar por isso ensinaria a pessoa a
  ignorar o selo que importa. As réguas são as do `computer-upgrade.util`, as mesmas do filtro
  "Upgrade". Máquina arquivada ou descartada não tem aviso: fora de uso não recebe peça.

  - `data.computer`: o hardware medido e se a máquina está fora de uso.
  - `ui.className`: classes extras (o `z-20` do cartão, para o balão abrir no mouse).
-->
<script lang="ts" module>
  import { type UpgradeReason, upgradeReasonsOf } from '@template/shared/domain/computer-upgrade.util';
  import { type ComputerListItem } from '@template/shared/schemas/computer.schema';

  export type ComputerUpgradeSource = Pick<ComputerListItem, 'hardware' | 'isArchived' | 'disposedAt'>;

  export type AzuosComputerUpgradeBadgeProps = {
    data: { computer: ComputerUpgradeSource };
    ui?: { className?: string };
  };

  /**
   * Os motivos de upgrade da máquina — vazio quando ela está em dia ou fora de uso.
   *
   * Exportada e pura para ter teste próprio.
   */
  export function computerUpgradeReasonsOf(computer: ComputerUpgradeSource): UpgradeReason[] {
    if (computer.isArchived || computer.disposedAt) return [];

    return upgradeReasonsOf(computer.hardware ?? {});
  }

  /** "Precisa de upgrade: Pouca memória, Processador antigo" — o que o leitor de tela diz. */
  export function computerUpgradeMessage(reasons: readonly UpgradeReason[]): string {
    return `Precisa de upgrade: ${reasons.map((reason) => reason.label).join(', ')}`;
  }
</script>

<script lang="ts">
  import CircleFadingArrowUp from '@lucide/svelte/icons/circle-fading-arrow-up';

  import StatusBadge from '$lib/components/azuos-status-badge/azuos-status-badge.svelte';
  import * as Tooltip from '$lib/components/azuos-tooltip/azuos-tooltip';
  import { cn } from '$lib/utils/cn';

  let { data, ui }: AzuosComputerUpgradeBadgeProps = $props();

  const reasons = $derived(computerUpgradeReasonsOf(data.computer));
</script>

{#if reasons.length > 0}
  <Tooltip.Provider>
    <Tooltip.Root>
      <Tooltip.Trigger>
        {#snippet child({ props })}
          <span
            {...props}
            role="img"
            aria-label={computerUpgradeMessage(reasons)}
            data-slot="computer-upgrade-badge"
            class={cn('inline-flex shrink-0', ui?.className)}
          >
            <StatusBadge data={{ label: 'Upgrade' }} ui={{ tone: 'warning', icon: CircleFadingArrowUp, size: 'sm' }} />
          </span>
        {/snippet}
      </Tooltip.Trigger>
      <Tooltip.Content role="tooltip" class="max-w-xs whitespace-normal">
        <span class="block font-semibold">Precisa de upgrade</span>
        <ul class="mt-1 flex flex-col gap-0.5">
          {#each reasons as reason (reason.need)}
            <li><span class="font-medium">{reason.label}:</span> {reason.detail}</li>
          {/each}
        </ul>
      </Tooltip.Content>
    </Tooltip.Root>
  </Tooltip.Provider>
{/if}
