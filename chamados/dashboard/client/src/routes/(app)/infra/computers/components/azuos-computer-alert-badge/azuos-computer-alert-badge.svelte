<!--
  @component
  O SELO DE PENDÊNCIA da máquina — a bolinha vermelha com o número do que pede ação agora,
  piscando com uma onda por trás dela. O mesmo selo do cartão de empresa do Paralegal: no cartão
  fica no canto da faixa de cima; na tabela, antes do nome.

  Conta os alertas críticos abertos e soma 1 quando a preventiva está vencida. Máquina sem
  nenhum dos dois, arquivada ou descartada não tem selo: fora de uso não pede visita.

  A cor é o FUNDO da bolinha (vermelho cheio com o número claro): a pendência é a mesma cor nos
  dois casos porque as duas pedem o técnico. A onda é `motion-safe:` — quem pediu menos movimento
  vê a bolinha parada, e a cor continua dizendo o mesmo.

  - `data.computer`: os alertas abertos, a preventiva e se a máquina está fora de uso.
  - `ui.className`: classes extras (o `z-10` da tabela, para o balão abrir no mouse).
-->
<script lang="ts" module>
  import { type ComputerListItem } from '@template/shared/schemas/computer.schema';

  export type ComputerPendingSource = Pick<
    ComputerListItem,
    'activeAlerts' | 'preventiveStatus' | 'isArchived' | 'disposedAt'
  >;

  export type AzuosComputerAlertBadgeProps = {
    data: { computer: ComputerPendingSource };
    ui?: { className?: string };
  };

  /** O que a máquina tem pendente: quantos alertas abertos e se a preventiva venceu. */
  export type ComputerPending = { alerts: number; isPreventiveDue: boolean; count: number };

  /**
   * A pendência da máquina, ou `null` quando não há nada a fazer.
   *
   * Exportada e pura para ter teste próprio: é ela que decide se o cartão pisca, e piscar sem
   * motivo ensina a pessoa a ignorar o selo.
   */
  export function computerPendingOf(computer: ComputerPendingSource): ComputerPending | null {
    if (computer.isArchived || computer.disposedAt) return null;

    const alerts = Math.max(0, computer.activeAlerts);
    const isPreventiveDue = computer.preventiveStatus === 'due';
    const count = alerts + (isPreventiveDue ? 1 : 0);

    return count > 0 ? { alerts, isPreventiveDue, count } : null;
  }

  /** "2 alertas críticos ativos · Preventiva vencida" — o que o balão e o leitor de tela dizem. */
  export function computerPendingMessage(pending: ComputerPending): string {
    const parts: string[] = [];
    if (pending.alerts === 1) parts.push('1 alerta crítico ativo');
    if (pending.alerts > 1) parts.push(`${pending.alerts} alertas críticos ativos`);
    if (pending.isPreventiveDue) parts.push('Preventiva vencida');

    return parts.join(' · ');
  }
</script>

<script lang="ts">
  import * as Tooltip from '$lib/components/azuos-tooltip/azuos-tooltip';
  import { cn } from '$lib/utils/cn';

  let { data, ui }: AzuosComputerAlertBadgeProps = $props();

  const pending = $derived(computerPendingOf(data.computer));
  const FILL = 'bg-destructive-fill text-on-dark';
</script>

{#if pending}
  {@const message = computerPendingMessage(pending)}
  <Tooltip.Provider>
    <Tooltip.Root>
      <Tooltip.Trigger>
        {#snippet child({ props })}
          <span
            {...props}
            role="img"
            aria-label={message}
            data-slot="computer-alert-badge"
            class={cn('relative flex size-5 shrink-0', ui?.className)}
          >
            <span
              aria-hidden="true"
              class={cn('absolute inline-flex size-full rounded-full motion-safe:animate-ping', FILL)}
            ></span>
            <span
              aria-hidden="true"
              class={cn(
                'relative inline-flex size-5 items-center justify-center rounded-full text-xs font-bold tabular-nums',
                FILL,
              )}
            >
              <!-- Até 99 cabe na bolinha; o número inteiro está no balão. -->
              {pending.count > 99 ? '99+' : pending.count}
            </span>
          </span>
        {/snippet}
      </Tooltip.Trigger>
      <Tooltip.Content role="tooltip" class="max-w-xs whitespace-normal">{message}</Tooltip.Content>
    </Tooltip.Root>
  </Tooltip.Provider>
{/if}
