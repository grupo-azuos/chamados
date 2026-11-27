<!--
  @component
  O CARTÃO DA MÁQUINA na grade do inventário, no mesmo formato do cartão de empresa do Paralegal
  (padrão Apple): superfície sem borda, faixa cinza em cima, ícone cheio do assunto, quatro
  números e o rodapé de quem é.

  - A FAIXA DE CIMA é a saúde num olhar (bolinha + "Boa", "Atenção", "Crítica"); do lado, a
    situação (arquivada, bloqueada, online ou offline), o aviso âmbar de UPGRADE quando a máquina
    está aquém (`AzuosComputerUpgradeBadge`, não pisca) e o SELO que pisca enquanto houver alerta
    crítico aberto ou preventiva vencida (`AzuosComputerAlertBadge`).
  - O ÍCONE CHEIO é a condição dos recursos (disco, memória, tempo sem reiniciar), no tom dela —
    a cor do assunto mora no ícone, nunca no fundo nem no hover do card.
  - Os QUATRO NÚMEROS: nota de saúde, chamados no mês, alertas abertos e disco livre.
  - A MANUTENÇÃO (`AzuosComputerMaintenanceStatus`) vem logo abaixo, a mesma leitura da tabela.
  - O RODAPÉ diz de quem é e quando a máquina deu sinal por último, com "Ver ficha".

  Desenhado sobre o `AzuosContentCard`, o cartão de registro comum a todas as grades do sistema.

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
  import { computerDepartmentLabel, computerResponsibleLabel } from '$lib/utils/computer-place.util';

  import AlertBadge from '../azuos-computer-alert-badge/azuos-computer-alert-badge.svelte';
  import UpgradeBadge from '../azuos-computer-upgrade-badge/azuos-computer-upgrade-badge.svelte';
  import ComputerMaintenanceStatus from '../azuos-computer-maintenance-status/azuos-computer-maintenance-status.svelte';
  import ContentCard, {
    type AzuosContentCardMetric,
  } from '$lib/components/azuos-content-card/azuos-content-card.svelte';
  import { RESOURCE_CONDITION_ICONS } from '$lib/utils/resource-condition-icon.util';

  let { data, ui, actions }: AzuosComputerCardProps = $props();

  const computer = $derived(data.computer);
  const name = $derived(displayNameOf(computer));
  const healthTone = $derived(healthStatusTone(computer.healthStatus));
  const situation = $derived(situationOf(computer));
  const condition = $derived(resourceConditionOf(computer.hardware ?? {}));
  const freeDisk = $derived(freeDiskPercentOf(computer));

  /* Os quatro números, com a bolinha no tom do assunto. O número fica na cor do texto: a cor
     mora na bolinha, nunca no número (padrão Apple). Zero apaga a bolinha. */
  const tally = $derived<AzuosContentCardMetric[]>([
    { key: 'health', label: 'Saúde', value: String(computer.healthScore), tone: healthTone },
    {
      key: 'tickets',
      label: 'Chamados',
      value: String(computer.ticketsThisMonth),
      tone: 'blue',
      isOn: computer.ticketsThisMonth > 0,
    },
    {
      key: 'alerts',
      label: 'Alertas',
      value: String(computer.activeAlerts),
      tone: 'red',
      isOn: computer.activeAlerts > 0,
    },
    {
      key: 'disk',
      label: 'Disco livre',
      value: freeDisk === null ? '—' : `${freeDisk}%`,
      tone: 'steel',
      isOn: freeDisk !== null,
    },
  ]);
</script>

<ContentCard
  data={{
    label: `Ver ficha de ${name}`,
    title: name,
    code: computer.hardware?.hostname || computer.name,
    meta: `${COMPUTER_KIND_LABELS[computer.kind]} · ${computerDepartmentLabel(computer)}`,
    status: { label: healthStatusLabel(computer.healthStatus), tone: healthTone },
    tags: [
      /* Offline e arquivada ficam com a bolinha no cinza do fio. */
      { label: situation.label, tone: situation.tone === 'neutral' ? null : situation.tone },
    ],
    metrics: tally,
    /* Sem responsável é dito por extenso: é uma máquina esperando quem responda por ela. A foto
       vem do admin-console (o servidor lê a pessoa pelo id); sem ela, as iniciais. */
    footer: {
      title: computerResponsibleLabel(computer),
      subtitle: lastSeenLabelOf(computer),
      person: computer.responsibleName
        ? { id: computer.responsibleId, name: computer.responsibleName, avatarUrl: computer.responsibleAvatarUrl ?? null }
        : null,
    },
    openLabel: 'Ver ficha',
  }}
  ui={{
    icon: RESOURCE_CONDITION_ICONS[condition],
    iconTone: resourceConditionTone(condition),
    iconLabel: `Recursos: ${RESOURCE_CONDITION_LABELS[condition]}`,
    footerIcon: Clock,
    slot: 'computer-card',
    className: ui?.className,
  }}
  actions={{ onOpen: () => actions.onOpen(computer) }}
>
  {#snippet stripEnd()}
    <!-- Acima da camada clicável do card, para o balão do selo abrir no mouse. O aviso de
         upgrade vem antes do selo vermelho: é atenção, calmo, e não pisca. -->
    <UpgradeBadge data={{ computer }} ui={{ className: 'relative z-20' }} />
    <AlertBadge data={{ computer }} ui={{ className: 'relative z-20' }} />
  {/snippet}
  {#snippet notes()}
    <ComputerMaintenanceStatus data={{ computer, scheduledFor: data.scheduledFor ?? null }} />
  {/snippet}
</ContentCard>
