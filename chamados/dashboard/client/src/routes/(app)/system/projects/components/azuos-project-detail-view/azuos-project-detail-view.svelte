<!--
  @component
  A PÁGINA DE UM SISTEMA: em que etapa ele está e tudo o que aconteceu nele.

  Em cima, o andamento de relance — o que está sendo feito agora (PRs abertos), o que está pedido
  (issues abertas), quanto foi entregue na semana e os chamados em aberto. No meio, a lista do que
  está em andamento e os chamados abertos (clicáveis). Embaixo, a timeline dia a dia: PRs, merges e
  issues, com quem fez e quem fez junto, filtrável por tipo. A situação de cada evento é dita para
  quem não lê GitHub ("Entregue", "Em andamento", "Pendente" — `eventStatusOf`). O botão de
  sincronizar com o GitHub só aparece com `canSync`.

  Função pura de props: não busca nada e não navega.

  - `data`: `backDestination`, `project`, `progress`, `days`, `openTickets`, `filter`,
    `isTruncated` e `syncMessage`.
  - `state`: `isSyncing`, `syncError` e `canSync`.
  - `actions`: `onFilterChange`, `onSync`, `onBack` e `onOpenTicket(ticket)`.
-->
<script lang="ts" module>
  import {
    TIMELINE_EVENT_TYPE_LABELS,
    softwareProjectStatusLabel,
  } from '@template/shared/domain/software-project.util';
  import { ticketProblemTypeLabel } from '@template/shared/domain/ticket-catalog.util';
  import { formatTicketProtocol } from '@template/shared/domain/ticket-protocol.util';
  import { ticketStatusLabel, ticketStatusTone } from '@template/shared/domain/ticket-status.util';
  import { type SoftwareProject } from '@template/shared/schemas/software-project.schema';
  import { type SoftwareTimelineEvent } from '@template/shared/schemas/software-timeline.schema';
  import { type Ticket } from '@template/shared/schemas/ticket.schema';

  import { type StatusBadgeTone } from '$lib/components/azuos-status-badge/azuos-status-badge.svelte';

  import BackButton from '$lib/components/azuos-back-button/azuos-back-button.svelte';
  import {
    type ProjectProgress,
    type ProjectTimelineDay,
    type ProjectTimelineFilter,
  } from '$lib/hooks/use-software-project-detail/use-software-project-detail.svelte';

  /**
   * A PÁGINA DE UM SISTEMA: em que etapa ele está e tudo o que aconteceu nele.
   *
   * Em cima, o andamento de relance — o que está sendo feito agora (PRs abertos), o que está
   * pedido (issues abertas), quanto foi entregue na semana e os chamados em aberto. Embaixo, a
   * timeline dia a dia: PRs, merges e issues, com quem fez e quem fez junto.
   *
   * Função pura de props: não busca nada e não navega.
   */
  export type AzuosProjectDetailViewProps = {
    data: {
      /** O nome da tela para onde o "voltar" leva — a anterior do caminho da pessoa. */
      backDestination?: string;
      project: SoftwareProject;
      progress: ProjectProgress;
      days: ProjectTimelineDay[];
      openTickets: Ticket[];
      filter: ProjectTimelineFilter;
      isTruncated?: boolean;
      syncMessage?: string | null;
    };
    state: {
      isSyncing?: boolean;
      syncError?: string | null;
      canSync?: boolean;
    };
    actions: {
      onFilterChange: (filter: ProjectTimelineFilter) => void;
      onSync: () => void;
      onBack: () => void;
      onOpenTicket: (ticket: Ticket) => void;
    };
  };

  const FILTER_OPTIONS = [
    { value: 'pr', label: 'Pull Requests' },
    { value: 'merge', label: 'Merges' },
    { value: 'issue', label: 'Issues' },
  ];

  /** O que o evento significa para quem não lê GitHub: "entregue", "em andamento", "resolvida". */
  export function eventStatusOf(event: SoftwareTimelineEvent): { label: string; tone: StatusBadgeTone } {
    if (event.type === 'merge') return { label: 'Entregue', tone: 'success' };
    if (event.type === 'pr' && event.status === 'merged') return { label: 'Entregue', tone: 'success' };
    if (event.type === 'pr' && event.status === 'open') return { label: 'Em andamento', tone: 'info' };
    if (event.type === 'issue' && event.status === 'open') return { label: 'Pendente', tone: 'warning' };
    if (event.type === 'issue') return { label: 'Resolvida', tone: 'success' };
    if (event.type === 'pr') return { label: 'Fechado sem merge', tone: 'neutral' };

    /* Release, deploy, manutenção: o próprio tipo diz o que foi. */
    return { label: TIMELINE_EVENT_TYPE_LABELS[event.type], tone: 'brand' };
  }

  /** "Vinícius Gabriel com Guilherme Siqueira": quem fez, e quem fez junto. */
  export function peopleLineOf(event: SoftwareTimelineEvent): string {
    const author = event.authorName || event.author || 'Não informado';
    const others = (event.coAuthors ?? []).filter((name) => name.trim() !== '');
    if (others.length === 0) return author;

    return `${author} com ${others.join(', ')}`;
  }

  function formatDay(day: string): string {
    return new Date(`${day}T12:00:00`).toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  }
</script>

<script lang="ts">
  import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
  import CircleDot from '@lucide/svelte/icons/circle-dot';
  import GitMerge from '@lucide/svelte/icons/git-merge';
  import GitPullRequest from '@lucide/svelte/icons/git-pull-request';
  import History from '@lucide/svelte/icons/history';
  import LifeBuoy from '@lucide/svelte/icons/life-buoy';
  import PackageCheck from '@lucide/svelte/icons/package-check';
  import RefreshCw from '@lucide/svelte/icons/refresh-cw';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import EmptyState from '$lib/components/azuos-empty-state/azuos-empty-state.svelte';
  import ErrorState from '$lib/components/azuos-error-state/azuos-error-state.svelte';
  import OptionPicker from '$lib/components/azuos-option-picker/azuos-option-picker.svelte';
  import PageHeader from '$lib/components/azuos-page-header/azuos-page-header.svelte';
  import ContentCard from '$lib/components/azuos-content-card/azuos-content-card.svelte';
  import StatCardGrid from '$lib/components/azuos-stat-card-grid/azuos-stat-card-grid.svelte';
  import StatusBadge from '$lib/components/azuos-status-badge/azuos-status-badge.svelte';
  import Timeline from '$lib/components/azuos-timeline/azuos-timeline.svelte';
  import TimelineStep from '$lib/components/azuos-timeline-step/azuos-timeline-step.svelte';
  import { projectStatusTone } from '../azuos-project-table/azuos-project-table.svelte';

  let { data, state, actions }: AzuosProjectDetailViewProps = $props();

  const progress = $derived(data.progress);
  const inProgress = $derived([...progress.openPullRequests, ...progress.openIssues]);
  const ICONS = { pr: GitPullRequest, merge: GitMerge, issue: CircleDot } as const;
  const iconOf = (event: SoftwareTimelineEvent) =>
    ICONS[event.type as keyof typeof ICONS] ?? History;
</script>

<div class="flex w-full flex-col gap-6">
  <BackButton data={{ destination: data.backDestination ?? 'os projetos' }} actions={{ onClick: actions.onBack }} />

  <PageHeader
    data={{
      title: data.project.name,
      description: data.project.description || 'Sem descrição cadastrada.',
    }}
  >
    <StatusBadge data={{ label: softwareProjectStatusLabel(data.project.status) }} ui={{ tone: projectStatusTone(data.project) }} />
    {#if state.canSync}
      <ActionButton
        data={{ label: 'Sincronizar com o GitHub', loadingLabel: 'Sincronizando…' }}
        ui={{ variant: 'secondary', icon: RefreshCw }}
        state={{ isLoading: state.isSyncing }}
        actions={{ onClick: actions.onSync }}
      />
    {/if}
  </PageHeader>

  {#if state.syncError}
    <ErrorState data={{ message: state.syncError }} ui={{ variant: 'inline' }} />
  {:else if data.syncMessage}
    <p class="text-muted-foreground text-sm" role="status">{data.syncMessage}</p>
  {/if}

  <!-- 1. O andamento de relance. -->
  <StatCardGrid>
    <ContentCard data={{ label: 'Em andamento', title: 'Em andamento', highlight: { value: progress.openPullRequests.length, hint: 'PRs abertos' } }} ui={{ icon: GitPullRequest, iconTone: 'info' }} />
    <ContentCard data={{ label: 'Issues pendentes', title: 'Issues pendentes', highlight: { value: progress.openIssues.length } }} ui={{ icon: CircleDot, iconTone: 'warning' }} />
    <ContentCard data={{ label: 'Entregas em 7 dias', title: 'Entregas em 7 dias', highlight: { value: progress.deliveredLastWeek, hint: 'PRs mergeados e merges sem PR' } }} ui={{ icon: PackageCheck, iconTone: 'success' }} />
    <ContentCard data={{ label: 'Chamados abertos', title: 'Chamados abertos', highlight: { value: data.openTickets.length } }} ui={{ icon: LifeBuoy, iconTone: 'danger' }} />
  </StatCardGrid>

  <!-- 2. O que está acontecendo agora, e os chamados que dependem disso. Cada bloco é o card de
       conteúdo do grupo, com o título e a linha de apoio no cabeçalho dele. -->
  <div class="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
    <ContentCard
      data={{ label: 'Em andamento agora', title: 'Em andamento agora', meta: 'PRs abertos e issues pendentes, do mais recente.' }}
      ui={{ className: 'min-w-0', icon: GitPullRequest, iconTone: 'info' }}
    >
      {#snippet body()}
        {#if inProgress.length === 0}
          <p class="text-muted-foreground py-4 text-center text-sm">Nada em aberto neste sistema.</p>
        {:else}
          <ul class="divide-border -mx-4 divide-y">
            {#each inProgress as event (event.id)}
              {@const Icon = iconOf(event)}
              {@const status = eventStatusOf(event)}
              <li class="flex min-w-0 items-start gap-3 px-4 py-3">
                <Icon class="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <div class="min-w-0 flex-1">
                  <p class="text-foreground text-sm font-medium break-words">{event.title}</p>
                  <p class="text-muted-foreground text-xs">
                    {event.externalId ?? ''} · {peopleLineOf(event)} · desde {formatDate(event.eventDate)}
                  </p>
                </div>
                <StatusBadge data={{ label: status.label }} ui={{ tone: status.tone, size: 'sm' }} />
                {#if event.url}
                  <a
                    href={event.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-muted-foreground hover:text-foreground shrink-0"
                    aria-label={`Abrir ${event.externalId ?? 'item'} no GitHub`}
                  >
                    <ArrowUpRight class="size-4" aria-hidden="true" />
                  </a>
                {/if}
              </li>
            {/each}
          </ul>
        {/if}
      {/snippet}
    </ContentCard>

    <ContentCard
      data={{ label: 'Chamados abertos', title: 'Chamados abertos', meta: 'Os pedidos de suporte deste sistema ainda sem solução.' }}
      ui={{ className: 'min-w-0', icon: LifeBuoy, iconTone: 'danger' }}
    >
      {#snippet body()}
        {#if data.openTickets.length === 0}
          <p class="text-muted-foreground py-4 text-center text-sm">Nenhum chamado aberto.</p>
        {:else}
          <ul class="flex flex-col gap-0.5">
            {#each data.openTickets as ticket (ticket.id)}
              <li>
                <!-- A linha da lista: o véu neutro no hover, com respiro e canto de controle. -->
                <button
                  type="button"
                  onclick={() => actions.onOpenTicket(ticket)}
                  class="hover:bg-hover-veil rounded-control focus-visible:ring-ring/50 flex w-full min-w-0 items-start gap-3 px-2 py-2 text-left transition-colors focus-visible:ring-3 focus-visible:outline-none"
                >
                  <div class="min-w-0 flex-1">
                    <p class="text-foreground text-sm font-medium">
                      <span class="font-mono text-xs">{formatTicketProtocol(ticket.id)}</span> ·
                      {ticketProblemTypeLabel(ticket.problemType)}
                    </p>
                    <p class="text-muted-foreground truncate text-xs">{ticket.requesterName}</p>
                  </div>
                  <StatusBadge
                    data={{ label: ticketStatusLabel(ticket.status) }}
                    ui={{ tone: ticketStatusTone(ticket.status), size: 'sm' }}
                  />
                </button>
              </li>
            {/each}
          </ul>
        {/if}
      {/snippet}
    </ContentCard>
  </div>

  <!-- 3. A timeline, dia a dia, na linha do tempo do grupo (`AzuosTimeline`). -->
  <ContentCard
    data={{ label: 'Timeline', title: 'Timeline', meta: 'Tudo o que aconteceu no repositório, com quem fez e quem fez junto.' }}
    ui={{ className: 'min-w-0', icon: History, iconTone: 'steel' }}
  >
    {#snippet tools()}
      <OptionPicker
        data={{ value: data.filter, options: FILTER_OPTIONS }}
        ui={{ ariaLabel: 'Filtrar a timeline', allLabel: 'Tudo' }}
        actions={{ onChange: (value: string) => actions.onFilterChange(value as ProjectTimelineFilter) }}
      />
    {/snippet}
    {#snippet body()}
      {#if data.days.length === 0}
        <EmptyState
          data={{
            title: 'Nada na timeline ainda',
            description: 'Sincronize com o GitHub para trazer os PRs, merges e issues deste sistema.',
          }}
          ui={{ icon: History }}
        />
      {:else}
        <ol class="flex flex-col gap-6 pt-2">
          {#each data.days as day (day.day)}
            <li class="min-w-0">
              <h3 class="text-muted-foreground mb-3 text-sm font-medium">{formatDay(day.day)}</h3>
              <Timeline>
                {#each day.events as event, index (event.id)}
                  {@const status = eventStatusOf(event)}
                  <TimelineStep
                    data={{
                      title: event.title,
                      description: `${TIMELINE_EVENT_TYPE_LABELS[event.type]}${event.externalId ? ` ${event.externalId}` : ''} · ${peopleLineOf(event)} · ${formatTime(event.eventDate)}`,
                      icon: iconOf(event),
                    }}
                    ui={{ isLast: index === day.events.length - 1 }}
                  >
                    <span class="flex flex-wrap items-center gap-2 text-xs">
                      <StatusBadge data={{ label: status.label }} ui={{ tone: status.tone, size: 'sm' }} />
                      {#if event.url}
                        <a href={event.url} target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">
                          ver no GitHub
                        </a>
                      {/if}
                    </span>
                  </TimelineStep>
                {/each}
              </Timeline>
            </li>
          {/each}
        </ol>
        {#if data.isTruncated}
          <p class="text-muted-foreground border-border mt-4 border-t pt-3 text-xs">
            Mostrando a atividade mais recente. O histórico mais antigo continua no GitHub.
          </p>
        {/if}
      {/if}
    {/snippet}
  </ContentCard>
</div>
