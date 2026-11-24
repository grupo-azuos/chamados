<!--
  @component
  UM CHAMADO NO QUADRO DA FILA — no formato do cartão do kanban do paralegal (Solicitações), nas
  três áreas (Infraestrutura, Sistema e Manutenção): a faixa cinza com a situação (bolinha e nome
  no tom da etapa) e o protocolo; o ícone cheio da etapa, o texto do chamado em até duas linhas e os
  selos (o assunto, a urgência, a etiqueta e, em Sistema, a issue do GitHub); no pé, quem atende
  (com a foto), quem abriu e quando, e o menu da etiqueta. Mudou de coluna, a cor muda junto.

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
  import Ellipsis from '@lucide/svelte/icons/ellipsis';

  import {
    actionButton,
    AzuosButtonPrimitive as Button,
    AzuosDropdownMenuPrimitive as DropdownMenu,
  } from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import CardSurface from '$lib/components/azuos-card-surface/azuos-card-surface.svelte';
  import Hint from '$lib/components/azuos-hint/azuos-hint.svelte';
  import AzuosPersonAvatar from '$lib/components/azuos-person-avatar/azuos-person-avatar.svelte';
  import AzuosStatusBadge from '$lib/components/azuos-status-badge/azuos-status-badge.svelte';
  import { cardToneClasses } from '$lib/utils/card-tone.util';
  import { cn } from '$lib/utils/cn';
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
  const tone = $derived(cardToneClasses(ui.tone));
  const Icon = $derived(ui.icon);
</script>

<CardSurface
  data={{ label: `Abrir o chamado ${ticket.protocol}` }}
  ui={{ className: 'flex flex-col text-left' }}
  actions={actions ? { onClick: () => actions.onOpen(ticket.id) } : undefined}
>
  <!-- A FAIXA da situação, como no paralegal: a bolinha e o nome no tom da etapa; à direita, o
       protocolo. -->
  <div class="bg-muted flex items-center justify-between gap-2 px-4 py-1.5 text-xs font-semibold">
    <span class={cn('flex min-w-0 items-center gap-1.5', tone.text)}>
      <span aria-hidden="true" class={cn('size-1.5 shrink-0 rounded-full', tone.swatch)}></span>
      <span class="truncate">{ui.stageLabel ?? ''}</span>
    </span>
    <span class="text-muted-foreground font-mono">{ticket.protocol}</span>
  </div>

  <div class="flex items-start gap-3 px-4 pt-3">
    <span aria-hidden="true" class={cn('rounded-icon inline-flex size-9 shrink-0 items-center justify-center shadow-xs', tone.dot)}>
      <Icon class="size-4.5" />
    </span>
    <div class="flex min-w-0 flex-1 flex-col">
      <Hint data={{ text: ticket.description }}>
        {#snippet child(props)}
          <h3 {...props} class="text-foreground line-clamp-2 text-sm leading-tight font-semibold">{ticket.description}</h3>
        {/snippet}
      </Hint>
      <span class="mt-1 flex flex-wrap items-center gap-1">
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
            class="rounded-chip bg-muted text-muted-foreground hover:text-foreground relative z-20 inline-flex items-center gap-0.5 px-2 py-0.5 font-mono text-xs hover:underline"
          >
            #{ticket.githubIssueNumber}
            <ArrowUpRight aria-hidden="true" class="size-3" />
          </a>
        {/if}
        {#if isBusy}
          <span class="text-muted-foreground text-xs">Salvando…</span>
        {/if}
      </span>
    </div>
  </div>

  <div aria-hidden="true" class="min-h-3 flex-1"></div>

  <!-- O PÉ: quem atende (com a foto), quem abriu e quando; o menu da etiqueta no canto. -->
  <div class="border-border flex items-center gap-2.5 border-t px-4 py-3">
    <AzuosPersonAvatar name={assigneeName} avatarUrl={data.assigneePhoto} personId={ticket.assigneeId} ui={{ size: 'sm' }} />
    <span class="flex min-w-0 flex-1 flex-col">
      <span class="truncate text-xs font-semibold">{assigneeName}</span>
      <span class="text-muted-foreground truncate text-xs">{ticket.requesterName} · {formatDate(ticket.createdAt)}</span>
    </span>
    {#if actions}
      <!-- No rodapé, como no paralegal; sobe acima do botão que cobre o card (o clique não abre o
           chamado) e não começa um arrasto (`data-no-drag`). -->
      <div class="relative z-20 shrink-0" data-no-drag>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger disabled={isBusy}>
            {#snippet child({ props })}
              <Button
                {...props}
                type="button"
                aria-label={`Etiqueta do chamado ${ticket.protocol}`}
                class={actionButton({ variant: 'ghost', size: 'sm', isIconOnly: true })}
              >
                <Ellipsis aria-hidden="true" />
              </Button>
            {/snippet}
          </DropdownMenu.Trigger>
          <DropdownMenu.Content
            align="center"
            class="rounded-surface ring-foreground/8 w-max max-w-[min(26rem,calc(100vw-2rem))] min-w-56 border-transparent p-1.5 shadow-xl"
          >
            <DropdownMenu.Label class="px-3">Etiqueta</DropdownMenu.Label>
            {#each TICKET_LABEL_OPTIONS as option (option.tone)}
              <DropdownMenu.Item
                class="rounded-chip min-h-10 cursor-pointer gap-2 px-3 py-2"
                onSelect={() => actions.onSetLabel(ticket.id, option.tone)}
              >
                <span aria-hidden="true" class={`size-2 shrink-0 rounded-full ${cardToneClasses(option.tone).swatch}`}></span>
                {option.label}
              </DropdownMenu.Item>
            {/each}
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </div>
    {/if}
  </div>
</CardSurface>
