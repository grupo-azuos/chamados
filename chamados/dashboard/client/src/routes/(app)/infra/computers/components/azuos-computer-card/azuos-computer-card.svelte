<!--
  @component
  O CARTÃO DA MÁQUINA na grade do inventário, no mesmo formato do cartão de empresa do Paralegal
  (padrão Apple): superfície sem borda, faixa cinza em cima, ícone cheio do assunto, quatro
  números e o rodapé de quem é.

  - A FAIXA DE CIMA é a saúde num olhar (bolinha + "Boa", "Atenção", "Crítica"); do lado, a
    situação (arquivada, bloqueada, online ou offline) e o SELO que pisca enquanto houver alerta
    crítico aberto ou preventiva vencida (`AzuosComputerAlertBadge`).
  - O ÍCONE CHEIO é a condição dos recursos (disco, memória, tempo sem reiniciar), no tom dela —
    a cor do assunto mora no ícone, nunca no fundo nem no hover do card.
  - Os QUATRO NÚMEROS: nota de saúde, chamados no mês, alertas abertos e disco livre.
  - A MANUTENÇÃO (`AzuosComputerMaintenanceStatus`) vem logo abaixo, a mesma leitura da tabela.
  - O RODAPÉ diz de quem é e quando a máquina deu sinal por último, com "Ver ficha".

  O cartão inteiro é o botão que abre a ficha. O hover é o neutro da superfície: sobe, a sombra
  cresce e o véu cinza cobre — nada de tingir o card.

  - `data`: `computer` e `scheduledFor` (o dia agendado, `AAAA-MM-DD`, que vem da Manutenção).
  - `ui.className`: classes extras.
  - `actions.onOpen(computer)`: abrir a ficha.
-->
<script lang="ts" module>
  import { formatTimeAgo } from '$lib/utils/format-machine';
  import { type Computer, type ComputerListItem } from '@template/shared/schemas/computer.schema';

  /**
   * O nome que a pessoa reconhece.
   *
   * O apelido dado pelo TI ganha da etiqueta que a máquina informa: quem procura "o computador
   * da recepção" não sabe que ele se chama RECEPCAO-01. O nome técnico continua embaixo, porque
   * é por ele que o agente aparece no log.
   */
  export function displayNameOf(computer: Computer): string {
    return computer.displayName?.trim() || computer.hardware?.hostname?.trim() || computer.name;
  }

  /** "Visto há 3 minutos" — ou o aviso de que o agente nunca falou. */
  export function lastSeenLabelOf(computer: Pick<Computer, 'lastSeenAt'>, now?: number): string {
    if (!computer.lastSeenAt) return 'Agente nunca conectou';

    return `Visto ${formatTimeAgo(computer.lastSeenAt, now)}`;
  }

  export type AzuosComputerCardProps = {
    data: { computer: ComputerListItem; scheduledFor?: string | null };
    ui?: { className?: string };
    actions: { onOpen: (computer: ComputerListItem) => void };
  };

  type Tone = 'success' | 'warning' | 'danger';

  /** A bolinha e o texto da saúde. Amarelo como texto usa o `-ink`, que não some no claro. */
  export const HEALTH_CLASSES: Record<Tone, { dot: string; text: string }> = {
    success: { dot: 'bg-hue-green', text: 'text-hue-green' },
    warning: { dot: 'bg-hue-yellow', text: 'text-hue-yellow-ink' },
    danger: { dot: 'bg-hue-red', text: 'text-hue-red' },
  };

  /** A situação na faixa de cima. Arquivada e bloqueada vêm antes: são decisões do TI. */
  export type ComputerSituation = {
    label: 'Arquivada' | 'Bloqueada' | 'Online' | 'Offline';
    dot: string;
    /** O tom do chip de status da tabela. */
    tone: 'neutral' | 'danger' | 'success';
  };

  export function situationOf(computer: ComputerListItem): ComputerSituation {
    if (computer.isArchived) return { label: 'Arquivada', dot: 'bg-border', tone: 'neutral' };
    if (computer.isBlocked) return { label: 'Bloqueada', dot: 'bg-hue-red', tone: 'danger' };
    if (computer.isOnline) return { label: 'Online', dot: 'bg-hue-green', tone: 'success' };

    return { label: 'Offline', dot: 'bg-border', tone: 'neutral' };
  }

  /** "38%" do disco livre, ou nulo quando o agente ainda não mediu. */
  export function freeDiskPercentOf(computer: ComputerListItem): number | null {
    const total = computer.hardware?.totalDiskBytes ?? null;
    const free = computer.hardware?.freeDiskBytes ?? null;
    if (!total || free === null) return null;

    return Math.round((free / total) * 100);
  }
</script>

<script lang="ts">
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
  import Clock from '@lucide/svelte/icons/clock';
  import {
    healthStatusLabel,
    healthStatusTone,
  } from '@template/shared/domain/computer-health.util';
  import { COMPUTER_KIND_LABELS } from '@template/shared/domain/computer-kind.util';
  import {
    RESOURCE_CONDITION_LABELS,
    resourceConditionOf,
    resourceConditionTone,
  } from '@template/shared/domain/computer-resource.util';
  import { departmentLabel } from '@template/shared/domain/department.util';

  import AlertBadge from '../azuos-computer-alert-badge/azuos-computer-alert-badge.svelte';
  import ComputerMaintenanceStatus from '../azuos-computer-maintenance-status/azuos-computer-maintenance-status.svelte';
  import CardSurface from '$lib/components/azuos-card-surface/azuos-card-surface.svelte';
  import PersonAvatar from '$lib/components/azuos-person-avatar/azuos-person-avatar.svelte';
  import { cardToneClasses } from '$lib/utils/card-tone.util';
  import { cn } from '$lib/utils/cn';
  import { RESOURCE_CONDITION_ICONS } from '$lib/utils/resource-condition-icon.util';

  let { data, ui, actions }: AzuosComputerCardProps = $props();

  const computer = $derived(data.computer);
  const name = $derived(displayNameOf(computer));
  const health = $derived(HEALTH_CLASSES[healthStatusTone(computer.healthStatus)]);
  const situation = $derived(situationOf(computer));
  const condition = $derived(resourceConditionOf(computer.hardware ?? {}));
  const ConditionIcon = $derived(RESOURCE_CONDITION_ICONS[condition]);
  const freeDisk = $derived(freeDiskPercentOf(computer));

  /* Os quatro números, com a bolinha no tom do assunto. O número fica na cor do texto: a cor
     mora na bolinha, nunca no número (padrão Apple). Zero apaga a bolinha. */
  const tally = $derived([
    { key: 'health', label: 'Saúde', value: String(computer.healthScore), dot: health.dot, isOn: true },
    {
      key: 'tickets',
      label: 'Chamados',
      value: String(computer.ticketsThisMonth),
      dot: 'bg-hue-blue',
      isOn: computer.ticketsThisMonth > 0,
    },
    {
      key: 'alerts',
      label: 'Alertas',
      value: String(computer.activeAlerts),
      dot: 'bg-hue-red',
      isOn: computer.activeAlerts > 0,
    },
    {
      key: 'disk',
      label: 'Disco livre',
      value: freeDisk === null ? '—' : `${freeDisk}%`,
      dot: 'bg-hue-steel',
      isOn: freeDisk !== null,
    },
  ]);
</script>

<CardSurface
  data={{ label: `Ver ficha de ${name}` }}
  ui={{ className: cn('flex flex-col text-left', ui?.className) }}
  actions={{ onClick: () => actions.onOpen(computer) }}
>
  <div
    data-slot="computer-card-strip"
    class="bg-muted flex items-center justify-between gap-2 px-4 py-1.5 text-xs font-semibold"
  >
    <span class={cn('flex items-center gap-1.5', health.text)}>
      <span aria-hidden="true" class={cn('size-1.5 rounded-full', health.dot)}></span>
      {healthStatusLabel(computer.healthStatus)}
    </span>
    <span class="text-muted-foreground flex items-center gap-2">
      <span class="flex items-center gap-1.5">
        <span aria-hidden="true" class={cn('size-1.5 rounded-full', situation.dot)}></span>
        {situation.label}
      </span>
      <!-- Acima da camada clicável do card, para o balão do selo abrir no mouse. -->
      <AlertBadge data={{ computer }} ui={{ className: 'relative z-20' }} />
    </span>
  </div>

  <div class="flex items-start gap-3 px-4 pt-3">
    <span
      role="img"
      aria-label={`Recursos: ${RESOURCE_CONDITION_LABELS[condition]}`}
      class={cn(
        'rounded-icon inline-flex size-9 shrink-0 items-center justify-center shadow-xs',
        cardToneClasses(resourceConditionTone(condition)).dot,
      )}
    >
      <ConditionIcon aria-hidden="true" class="block size-4.5 shrink-0 stroke-[1.8]" />
    </span>
    <div class="flex min-w-0 flex-1 flex-col">
      <h3 class="line-clamp-2 text-sm leading-tight font-semibold break-words">{name}</h3>
      <span class="text-muted-foreground mt-0.5 truncate font-mono text-xs">
        {computer.hardware?.hostname || computer.name}
      </span>
      <span class="text-muted-foreground truncate text-xs">
        {COMPUTER_KIND_LABELS[computer.kind]} ·
        {computer.department ? departmentLabel(computer.department) : 'Sem departamento'}
      </span>
    </div>
  </div>

  <div class="grid grid-cols-4 gap-1.5 px-4 pt-3">
    {#each tally as cell (cell.key)}
      <span
        data-slot={`computer-card-${cell.key}`}
        class="rounded-control bg-muted flex min-w-0 flex-col items-center py-1.5"
      >
        <span class="text-foreground text-base font-bold tabular-nums">{cell.value}</span>
        <span class="text-muted-foreground flex max-w-full items-center gap-1 px-1 text-xs">
          <span
            aria-hidden="true"
            class={cn('size-1.5 shrink-0 rounded-full', cell.isOn ? cell.dot : 'bg-border')}
          ></span>
          <span class="truncate">{cell.label}</span>
        </span>
      </span>
    {/each}
  </div>

  <!-- A manutenção cresce até o rodapé: os cartões da mesma linha têm a mesma altura, e sem isso
       cada um sobrava um vão diferente acima do rodapé. -->
  <div class="flex-1 px-4 pt-3">
    <ComputerMaintenanceStatus data={{ computer, scheduledFor: data.scheduledFor ?? null }} />
  </div>

  <div class="border-border mt-3 flex items-center gap-2.5 border-t px-4 py-3">
    <Clock aria-hidden="true" class="text-muted-foreground size-4 shrink-0" />
    <span class="flex min-w-0 flex-1 flex-col">
      <!-- Sem responsável é dito por extenso: é uma máquina esperando quem responda por ela. -->
      <span class="truncate text-xs font-semibold">{computer.responsibleName ?? 'Sem responsável'}</span>
      <span class="text-muted-foreground truncate text-xs">
        {lastSeenLabelOf(computer)}
      </span>
    </span>
    {#if computer.responsibleName}
      <PersonAvatar name={computer.responsibleName} ui={{ size: 'sm' }} />
    {/if}
    <!-- Só desenho: quem abre a ficha é o card inteiro, que já é o botão. -->
    <span
      aria-hidden="true"
      class="control-sm rounded-button bg-muted text-muted-foreground group-hover/card:bg-foreground group-hover/card:text-background inline-flex shrink-0 items-center gap-1 px-2.5 text-xs font-medium transition-colors"
    >
      Ver ficha
      <ArrowRight class="size-3.5" />
    </span>
  </div>
</CardSurface>
