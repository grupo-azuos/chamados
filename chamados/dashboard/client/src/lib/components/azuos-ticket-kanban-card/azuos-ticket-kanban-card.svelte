<!--
  @component
  UM CHAMADO NO QUADRO DA FILA — no formato do cartão do kanban do paralegal (Solicitações), nas
  três áreas (Infraestrutura, Sistema e Manutenção): a faixa cinza com a situação (bolinha e nome
  no tom da etapa) e o protocolo; o ícone cheio da etapa, o texto do chamado em até duas linhas e os
  selos (o assunto, a urgência, a etiqueta e, em Sistema, a issue do GitHub); no pé, quem atende
  (com a foto), quem abriu e quando; o menu da etiqueta é o de três pontinhos do card, no canto.
  Mudou de coluna, a cor muda junto.

  O primeiro selo diz DO QUE é o chamado: o sistema, em Sistema (o cadastrado ou o que quem abriu
  digitou); o tipo de problema, nas outras áreas ("Impressora", "Ar-condicionado").

  Clicar no cartão abre o chamado. Mudar de etapa é arrastando (ver `AzuosKanbanDraggableCard`),
  como no paralegal; a etiqueta, que o paralegal não tem, fica num menu pequeno de três pontinhos
  no canto.

  Props: `data` traz o chamado, a etiqueta e a foto do responsável; `ui` o ícone e o tom da etapa;
  `state.isBusy` mostra "Salvando…" e trava o menu; `actions` abre e etiqueta. Sem `actions`, o
  cartão é só desenho (a cópia que acompanha o ponteiro no arrasto).
-->
<script lang="ts" module>
  import type { LucideIcon } from '@lucide/svelte';
  import { ticketProblemTypeLabel } from '@template/shared/domain/ticket-catalog.util';
  import { type Ticket } from '@template/shared/schemas/ticket.schema';

  import { type StatusBadgeTone } from '$lib/components/azuos-status-badge/azuos-status-badge.svelte';
  import { type AzuosCardTone } from '$lib/utils/card-tone.util';

  export type AzuosTicketKanbanCardProps = {
    data: {
      ticket: Ticket;
      /** A etiqueta que a pessoa deu ao cartão; `null` (ou `neutral`) é sem etiqueta. */
      label: StatusBadgeTone | null;
      assigneePhoto: string | null;
    };
    /** `stageLabel`: o nome da coluna em que o cartão está (a faixa de cima). */
    ui: { icon: LucideIcon; tone: AzuosCardTone; stageLabel?: string };
    state?: { isBusy?: boolean };
    actions?: {
      onOpen: (ticketId: number) => void;
      onSetLabel: (ticketId: number, label: StatusBadgeTone) => void;
    };
  };

  const PRIORITY_TONES: Record<string, StatusBadgeTone> = {
    high: 'warning',
    medium: 'info',
    low: 'neutral',
  };

  const PRIORITY_LABELS: Record<string, string> = {
    high: 'Alta',
    medium: 'Média',
    low: 'Baixa',
  };

  /** As etiquetas que a pessoa dá ao cartão para priorizar. "Padrão" tira a etiqueta. */
  export const TICKET_LABEL_OPTIONS: { tone: StatusBadgeTone; label: string }[] = [
    { tone: 'brand', label: 'Destaque' },
    { tone: 'info', label: 'Info' },
    { tone: 'success', label: 'Aprovado' },
    { tone: 'warning', label: 'Atenção' },
    { tone: 'danger', label: 'Urgente' },
    { tone: 'neutral', label: 'Padrão' },
  ];

  /** Do que é o chamado: o sistema (cadastrado ou digitado) ou, sem sistema, o tipo de problema. */
  export function subjectOf(ticket: Ticket): string {
    return ticket.projectName ?? ticket.customSystemName ?? ticketProblemTypeLabel(ticket.problemType);
  }
</script>

<script lang="ts">
  import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
  import Tag from '@lucide/svelte/icons/tag';

  import ContentCard from '$lib/components/azuos-content-card/azuos-content-card.svelte';
  import AzuosStatusBadge from '$lib/components/azuos-status-badge/azuos-status-badge.svelte';
  import { formatDate } from '$lib/utils/format-date';

  let { data, ui, state: cardState, actions }: AzuosTicketKanbanCardProps = $props();

  const ticket = $derived(data.ticket);
  const subject = $derived(subjectOf(ticket));
  const labelText = $derived(
    data.label && data.label !== 'neutral'
      ? (TICKET_LABEL_OPTIONS.find((option) => option.tone === data.label)?.label ?? null)
      : null,
  );
  const assigneeName = $derived(ticket.assignee ?? 'Sem responsável');
  const isBusy = $derived(cardState?.isBusy ?? false);
  const Icon = $derived(ui.icon);

  /* A etiqueta mora no menu de três pontinhos do próprio card (o padrão do grupo), e não num
     menu montado à mão: o `id` de cada item é o tom da etiqueta. */
  const labelMenu = $derived(
    actions
      ? {
          label: `Etiqueta do chamado ${ticket.protocol}`,
          items: TICKET_LABEL_OPTIONS.map((option) => ({ id: option.tone, label: option.label, icon: Tag })),
        }
      : null,
  );
</script>

<ContentCard
  data={{
    label: `Abrir o chamado ${ticket.protocol}`,
    title: ticket.description,
    status: { label: ui.stageLabel ?? '', tone: ui.tone },
    tags: [{ label: ticket.protocol }],
    footer: {
      title: assigneeName,
      subtitle: `${ticket.requesterName} · ${formatDate(ticket.createdAt)}`,
      person: { id: ticket.assigneeId, name: assigneeName, avatarUrl: data.assigneePhoto },
    },
    menu: labelMenu,
  }}
  ui={{ icon: Icon, iconTone: ui.tone, className: 'flex flex-col' }}
  state={{ isMenuDisabled: isBusy }}
  actions={actions
    ? {
        onOpen: () => actions.onOpen(ticket.id),
        onMenuSelect: (tone) => actions.onSetLabel(ticket.id, tone as StatusBadgeTone),
      }
    : undefined}
>
  {#snippet body()}
    <span class="flex flex-wrap items-center gap-1">
      <AzuosStatusBadge data={{ label: subject }} ui={{ tone: 'neutral', size: 'sm' }} />
      <AzuosStatusBadge
        data={{ label: PRIORITY_LABELS[ticket.priority] ?? ticket.priority }}
        ui={{ tone: PRIORITY_TONES[ticket.priority] ?? 'neutral', size: 'sm' }}
      />
      {#if labelText && data.label}
        <AzuosStatusBadge data={{ label: labelText }} ui={{ tone: data.label, size: 'sm' }} />
      {/if}
      {#if ticket.githubIssueUrl && ticket.githubIssueNumber}
        <!-- A issue abre noutra aba e não abre o chamado: o link sobe acima do botão do card. -->
        <a
          href={ticket.githubIssueUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-no-drag
          class="text-primary relative z-20 inline-flex items-center gap-0.5 font-mono text-xs hover:underline"
        >
          #{ticket.githubIssueNumber}
          <ArrowUpRight aria-hidden="true" class="size-3" />
        </a>
      {/if}
      {#if isBusy}
        <span class="text-muted-foreground text-xs">Salvando…</span>
      {/if}
    </span>
  {/snippet}
</ContentCard>
