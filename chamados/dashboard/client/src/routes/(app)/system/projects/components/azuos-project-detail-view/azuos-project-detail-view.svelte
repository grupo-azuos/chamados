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

    return { label: 'Fechado', tone: 'neutral' };
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
  import ArrowLeft from '@lucide/svelte/icons/arrow-left';
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
  import FilterField from '$lib/components/azuos-filter-field/azuos-filter-field.svelte';
  import OptionPicker from '$lib/components/azuos-option-picker/azuos-option-picker.svelte';
  import PageHeader from '$lib/components/azuos-page-header/azuos-page-header.svelte';
  import StatCard from '$lib/components/azuos-stat-card/azuos-stat-card.svelte';
  import StatCardGrid from '$lib/components/azuos-stat-card-grid/azuos-stat-card-grid.svelte';
  import StatusBadge from '$lib/components/azuos-status-badge/azuos-status-badge.svelte';

  let { data, state, actions }: AzuosProjectDetailViewProps = $props();

  const progress = $derived(data.progress);
  const inProgress = $derived([...progress.openPullRequests, ...progress.openIssues]);
  const ICONS = { pr: GitPullRequest, merge: GitMerge, issue: CircleDot } as const;
  const iconOf = (event: SoftwareTimelineEvent) =>
    ICONS[event.type as keyof typeof ICONS] ?? History;
</script>

<div class="mx-auto flex w-full max-w-6xl flex-col gap-5">
  <div>
    <ActionButton
      data={{ label: 'Projetos' }}
      ui={{ variant: 'ghost', size: 'sm', icon: ArrowLeft }}
      actions={{ onClick: actions.onBack }}
    />
  </div>

  <PageHeader
    data={{
      title: data.project.name,
      description: data.project.description || 'Sem descrição cadastrada.',
    }}
  >
    <StatusBadge data={{ label: softwareProjectStatusLabel(data.project.status) }} ui={{ tone: 'success' }} />
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
    <p class="text-ink-500 text-sm" role="status">{data.syncMessage}</p>
  {/if}

  <!-- 1. O andamento de relance. -->
  <StatCardGrid>
    <StatCard
      data={{ label: 'Em andamento', value: progress.openPullRequests.length, hint: 'PRs abertos' }}
      ui={{ tone: 'info', icon: GitPullRequest }}
    />
    <StatCard
      data={{ label: 'Issues pendentes', value: progress.openIssues.length }}
      ui={{ tone: 'warning', icon: CircleDot }}
    />
    <StatCard
      data={{
        label: 'Entregas na semana',
        value: progress.deliveredLastWeek,
        hint: progress.lastActivityAt ? `última atividade em ${formatDate(progress.lastActivityAt)}` : null,
      }}
      ui={{ tone: 'success', icon: PackageCheck }}
    />
    <StatCard
      data={{ label: 'Chamados abertos', value: data.openTickets.length }}
      ui={{ tone: 'danger', icon: LifeBuoy }}
    />
  </StatCardGrid>

  <!-- 2. O que está acontecendo agora, e os chamados que dependem disso. -->
  <div class="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
    <section class="border-border/70 bg-card rounded-surface min-w-0 border shadow-xs">
      <header class="border-border/60 border-b px-4 py-3">
        <h2 class="text-ink-900 text-sm font-semibold">Em andamento agora</h2>
        <p class="text-ink-500 text-xs">PRs abertos e issues pendentes, do mais recente.</p>
      </header>
      {#if inProgress.length === 0}
        <p class="text-ink-500 px-4 py-6 text-center text-sm">Nada em aberto neste sistema.</p>
      {:else}
        <ul class="divide-border/60 divide-y">
          {#each inProgress as event (event.id)}
            {@const Icon = iconOf(event)}
            {@const status = eventStatusOf(event)}
            <li class="flex min-w-0 items-start gap-3 px-4 py-3">
              <Icon class="text-ink-500 mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <div class="min-w-0 flex-1">
                <p class="text-ink-900 text-sm font-medium break-words">{event.title}</p>
                <p class="text-ink-500 text-xs">
                  {event.externalId ?? ''} · {peopleLineOf(event)} · desde {formatDate(event.eventDate)}
                </p>
              </div>
              <StatusBadge data={{ label: status.label }} ui={{ tone: status.tone, size: 'sm' }} />
              {#if event.url}
                <a
                  href={event.url}
                  target="_blank"
                  rel="noreferrer"
                  class="text-ink-500 hover:text-foreground shrink-0"
                  aria-label={`Abrir ${event.externalId ?? 'item'} no GitHub`}
                >
                  <ArrowUpRight class="size-4" aria-hidden="true" />
                </a>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
    </section>

    <section class="border-border/70 bg-card rounded-surface min-w-0 border shadow-xs">
      <header class="border-border/60 border-b px-4 py-3">
        <h2 class="text-ink-900 text-sm font-semibold">Chamados abertos</h2>
        <p class="text-ink-500 text-xs">Os pedidos de suporte deste sistema ainda sem solução.</p>
      </header>
      {#if data.openTickets.length === 0}
        <p class="text-ink-500 px-4 py-6 text-center text-sm">Nenhum chamado aberto.</p>
      {:else}
        <ul class="divide-border/60 divide-y">
          {#each data.openTickets as ticket (ticket.id)}
            <li>
              <button
                type="button"
                onclick={() => actions.onOpenTicket(ticket)}
                class="hover:bg-muted/50 flex w-full min-w-0 items-start gap-3 px-4 py-3 text-left transition-colors"
              >
                <div class="min-w-0 flex-1">
                  <p class="text-ink-900 text-sm font-medium">
                    <span class="font-mono text-xs">{formatTicketProtocol(ticket.id)}</span> ·
                    {ticketProblemTypeLabel(ticket.problemType)}
                  </p>
                  <p class="text-ink-500 truncate text-xs">{ticket.requesterName}</p>
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
    </section>
  </div>

  <!-- 3. A timeline, dia a dia. -->
  <section class="border-border/70 bg-card rounded-surface min-w-0 border shadow-xs">
    <header
      class="border-border/60 flex min-w-0 flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-end sm:justify-between"
    >
      <div>
        <h2 class="text-ink-900 text-sm font-semibold">Timeline</h2>
        <p class="text-ink-500 text-xs">
          Tudo o que aconteceu no repositório, com quem fez e quem fez junto.
        </p>
      </div>
      <FilterField data={{ label: 'Mostrar' }} ui={{ className: 'items-start' }}>
        <OptionPicker
          data={{ value: data.filter, options: FILTER_OPTIONS }}
          ui={{ ariaLabel: 'Filtrar a timeline', allLabel: 'Tudo' }}
          actions={{ onChange: (value: string) => actions.onFilterChange(value as ProjectTimelineFilter) }}
        />
      </FilterField>
    </header>

    {#if data.days.length === 0}
      <EmptyState
        data={{
          title: 'Nada na timeline ainda',
          description: 'Sincronize com o GitHub para trazer os PRs, merges e issues deste sistema.',
        }}
        ui={{ icon: History }}
      />
    {:else}
      <ol class="flex flex-col gap-6 px-4 py-5">
        {#each data.days as day (day.day)}
          <li class="min-w-0">
            <h3 class="text-ink-500 mb-3 text-xs font-semibold tracking-wide uppercase">
              {formatDay(day.day)}
            </h3>
            <!-- A linha vertical liga os eventos do dia; o ícone marca o tipo. -->
            <ol class="border-border/70 ml-2 flex flex-col gap-4 border-l pl-5">
              {#each day.events as event (event.id)}
                {@const Icon = iconOf(event)}
                {@const status = eventStatusOf(event)}
                <li class="relative min-w-0">
                  <span
                    class="bg-card border-border/70 text-ink-700 absolute top-0.5 -left-[31px] grid size-5 place-items-center rounded-full border"
                    aria-hidden="true"
                  >
                    <Icon class="size-3" />
                  </span>
                  <div class="flex min-w-0 flex-wrap items-start justify-between gap-2">
                    <p class="text-ink-900 min-w-0 flex-1 basis-60 text-sm font-medium break-words">
                      {event.title}
                    </p>
                    <StatusBadge data={{ label: status.label }} ui={{ tone: status.tone, size: 'sm' }} />
                  </div>
                  <p class="text-ink-500 mt-0.5 text-xs">
                    {TIMELINE_EVENT_TYPE_LABELS[event.type]}
                    {event.externalId ? ` ${event.externalId}` : ''} · {peopleLineOf(event)} · {formatTime(event.eventDate)}
                    {#if event.url}
                      ·
                      <a href={event.url} target="_blank" rel="noreferrer" class="text-primary hover:underline">
                        ver no GitHub
                      </a>
                    {/if}
                  </p>
                </li>
              {/each}
            </ol>
          </li>
        {/each}
      </ol>
      {#if data.isTruncated}
        <p class="text-ink-500 border-border/60 border-t px-4 py-3 text-xs">
          Mostrando a atividade mais recente. O histórico mais antigo continua no GitHub.
        </p>
      {/if}
    {/if}
  </section>
</div>
