<script lang="ts" module>
  import {
    ticketAreaLabel,
    ticketDepartmentLabel,
    ticketProblemTypeLabel,
  } from '@template/shared/domain/ticket-catalog.util';
  import {
    isClosedTicketStatus,
    ticketPriorityLabel,
    ticketPriorityTone,
    ticketStatusLabel,
    ticketStatusPhase,
    ticketStatusTone,
    type TicketStatus,
  } from '@template/shared/domain/ticket-status.util';
  import { type MyTicket, type PublicTicket } from '@template/shared/schemas/ticket.schema';
  import type { Snippet } from 'svelte';

  /**
   * CONSULTAR CHAMADO — a tela de acompanhar, separada da de abrir.
   *
   * Duas colunas, como uma caixa de entrada: à esquerda a busca pelo número e os chamados da
   * pessoa (os que ela abriu e os em que foi vinculada), divididos entre "em andamento" e
   * "encerrados"; à direita o chamado aberto, com a TRILHA (recebido → em atendimento →
   * encerrado), os dados, a linha do tempo e o que ela pode fazer nele. No celular é uma coluna
   * só: abrir um chamado troca a lista por ele, e "Meus chamados" volta.
   *
   * Função pura de props: não busca nada. O chamado que chega já vem podado pelo servidor —
   * sem telefone e sem responsável, e só com os históricos visíveis para quem abriu.
   */
  export type AzuosTicketLookupViewProps = {
    data: {
      protocol: string;
      ticket: PublicTicket | null;
      /** Os chamados que a pessoa abriu ou em que foi vinculada. */
      mine: MyTicket[];
    };
    state?: {
      isSearching?: boolean;
      isInvalid?: boolean;
      isNotFound?: boolean;
      error?: string | null;
      isLoadingMine?: boolean;
      mineError?: string | null;
    };
    actions: {
      onProtocolChange: (protocol: string) => void;
      onSearch: () => void;
      /** Abre um dos chamados da lista, pelo número dele. */
      onOpenMine: (protocol: string) => void;
      /** Fecha o chamado aberto e volta para a lista. */
      onBackToList: () => void;
    };
    /**
     * O que quem pediu FAZ com o chamado aberto (responder, reabrir, vincular) — entra depois
     * da linha do tempo. É encaixe porque escrever tem estado e envio próprios.
     */
    slots?: { ticketActions?: Snippet<[PublicTicket]> };
  };

  export type JourneyStep = { label: string; state: 'done' | 'current' | 'next' };

  /**
   * A TRILHA do chamado em três paradas — o que a pessoa quer saber é "em que pé está", e o
   * nome da situação sozinho ("Aguardando peça") não diz se falta muito. A parada atual
   * leva o nome da situação, para a trilha e o selo não discordarem.
   */
  export function journeyOf(status: TicketStatus): JourneyStep[] {
    const phase = ticketStatusPhase(status);
    if (phase === 'closed') {
      return [
        { label: 'Recebido', state: 'done' },
        { label: 'Em atendimento', state: 'done' },
        { label: ticketStatusLabel(status), state: 'current' },
      ];
    }
    if (phase === 'queue') {
      return [
        { label: ticketStatusLabel(status), state: 'current' },
        { label: 'Em atendimento', state: 'next' },
        { label: 'Encerrado', state: 'next' },
      ];
    }

    return [
      { label: 'Recebido', state: 'done' },
      { label: ticketStatusLabel(status), state: 'current' },
      { label: 'Encerrado', state: 'next' },
    ];
  }

  /** Os chamados da pessoa, divididos entre os que ainda andam e os encerrados. */
  export function splitMine(mine: readonly MyTicket[]): { running: MyTicket[]; closed: MyTicket[] } {
    return {
      running: mine.filter((item) => !isClosedTicketStatus(item.status)),
      closed: mine.filter((item) => isClosedTicketStatus(item.status)),
    };
  }
</script>

<script lang="ts">
  import ArrowLeft from '@lucide/svelte/icons/arrow-left';
  import Building2 from '@lucide/svelte/icons/building-2';
  import CalendarPlus from '@lucide/svelte/icons/calendar-plus';
  import Clock from '@lucide/svelte/icons/clock';
  import FileSearch from '@lucide/svelte/icons/file-search';
  import ImageIcon from '@lucide/svelte/icons/image';
  import Inbox from '@lucide/svelte/icons/inbox';
  import Layers from '@lucide/svelte/icons/layers';
  import MonitorSmartphone from '@lucide/svelte/icons/monitor-smartphone';
  import Search from '@lucide/svelte/icons/search';
  import Users from '@lucide/svelte/icons/users';
  import Wrench from '@lucide/svelte/icons/wrench';
  import type { Component } from 'svelte';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import AttachmentList from '$lib/components/azuos-attachment-list/azuos-attachment-list.svelte';
  import EmptyState from '$lib/components/azuos-empty-state/azuos-empty-state.svelte';
  import ErrorState from '$lib/components/azuos-error-state/azuos-error-state.svelte';
  import HistoryTimeline, {
    formatHistoryDateTime,
  } from '$lib/components/azuos-history-timeline/azuos-history-timeline.svelte';
  import StatusBadge from '$lib/components/azuos-status-badge/azuos-status-badge.svelte';
  import TextField from '$lib/components/azuos-text-field/azuos-text-field.svelte';
  import { cn } from '$lib/utils/cn';

  let { data, state: viewState, actions, slots }: AzuosTicketLookupViewProps = $props();

  const ticket = $derived(data.ticket);
  const groups = $derived(splitMine(data.mine));

  /* Qual aba da lista está na frente é escolha de tela, não dado. Sem escolha, abre na que
     tem chamado andando — é o que a pessoa costuma vir ver. */
  let chosenTab = $state<'running' | 'closed' | null>(null);
  const tab = $derived(chosenTab ?? (groups.running.length > 0 || groups.closed.length === 0 ? 'running' : 'closed'));
  const visible = $derived(tab === 'running' ? groups.running : groups.closed);

  /* No celular só cabe uma coluna: com um chamado (ou um "não encontrado") na frente, a
     lista sai de cena até a pessoa voltar. */
  const isShowingResult = $derived(Boolean(ticket) || Boolean(viewState?.isNotFound) || Boolean(viewState?.error));

  /* Os arquivos do PRÓPRIO chamado. Os que entraram junto de um histórico aparecem dentro
     dele, na linha do tempo. */
  const ownFiles = $derived(
    (ticket?.attachments ?? []).filter((attachment) => attachment.historyId === null),
  );

  type Fact = { label: string; value: string; icon: Component; isCode?: boolean };

  /** O que dá para dizer do chamado numa grade de leitura rápida. */
  function factsOf(found: PublicTicket): Fact[] {
    const last = found.histories.at(-1);
    const facts: Fact[] = [
      { label: 'Área', value: ticketAreaLabel(found.area), icon: Layers },
      { label: 'Departamento', value: ticketDepartmentLabel(found.department), icon: Building2 },
      { label: 'Tipo', value: ticketProblemTypeLabel(found.problemType), icon: Wrench },
      { label: 'Aberto em', value: formatHistoryDateTime(found.createdAt), icon: CalendarPlus },
      {
        label: 'Última movimentação',
        value: formatHistoryDateTime(last?.createdAt ?? found.createdAt),
        icon: Clock,
      },
    ];
    if (found.watchers.length > 0) {
      facts.push({
        label: 'Vinculados',
        value: found.watchers.map((watcher) => watcher.name).join(', '),
        icon: Users,
      });
    }
    if (found.anydeskId) {
      facts.push({ label: 'AnyDesk', value: found.anydeskId, icon: MonitorSmartphone, isCode: true });
    }

    return facts;
  }

  function handleSubmit(event: SubmitEvent): void {
    event.preventDefault();
    actions.onSearch();
  }
</script>

<div class="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start">
  <!-- ESQUERDA: a busca e a caixa de entrada da pessoa. -->
  <aside
    class={cn('flex flex-col gap-4 lg:sticky lg:top-20', isShowingResult && 'hidden lg:flex')}
    aria-label="Meus chamados"
  >
    <form novalidate class="flex items-end gap-2" onsubmit={handleSubmit}>
      <TextField
        data={{ label: 'Número do chamado', name: 'protocol', value: data.protocol, placeholder: 'CH-0001' }}
        ui={{ className: 'flex-1' }}
        state={{
          /* Aparece enquanto a pessoa digita: explica por que o botão ainda não funciona. */
          error: viewState?.isInvalid ? 'Digite como CH-0001.' : null,
          isDisabled: viewState?.isSearching,
        }}
        actions={{ onChange: actions.onProtocolChange }}
      />
      <ActionButton
        data={{ label: 'Consultar', loadingLabel: 'Procurando…' }}
        ui={{ size: 'lg', icon: Search, isIconOnly: true }}
        state={{ isLoading: viewState?.isSearching, isDisabled: viewState?.isInvalid }}
        actions={{ onClick: actions.onSearch }}
      />
    </form>

    <!-- A aba escolhida ganha fundo cheio, não traço: barra colorida é proibida no grupo. -->
    <div class="bg-muted/50 rounded-control grid grid-cols-2 gap-1 p-1">
      {#each [{ key: 'running', label: 'Em andamento', count: groups.running.length }, { key: 'closed', label: 'Encerrados', count: groups.closed.length }] as const as option (option.key)}
        <button
          type="button"
          aria-pressed={tab === option.key}
          onclick={() => (chosenTab = option.key)}
          class={cn(
            'control-sm rounded-chip focus-visible:ring-ring inline-flex cursor-pointer items-center justify-center gap-1.5 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none',
            tab === option.key ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {option.label}
          <span class="bg-muted text-muted-foreground rounded-full px-1.5 text-[0.6875rem] tabular-nums">
            {option.count}
          </span>
        </button>
      {/each}
    </div>

    {#if viewState?.mineError}
      <ErrorState data={{ message: viewState.mineError }} ui={{ variant: 'inline' }} />
    {:else if viewState?.isLoadingMine}
      <ul class="flex flex-col gap-2" aria-label="Carregando os seus chamados">
        {#each [1, 2, 3] as item (item)}
          <li class="bg-muted/50 rounded-box h-20 animate-pulse"></li>
        {/each}
      </ul>
    {:else if visible.length === 0}
      <p class="text-muted-foreground bg-muted/40 rounded-box p-4 text-center text-sm">
        {tab === 'running'
          ? 'Nenhum chamado andando agora.'
          : 'Nenhum chamado encerrado ainda.'}
      </p>
    {:else}
      <ul class="flex flex-col gap-1.5">
        {#each visible as item (item.id)}
          {@const isOpen = ticket?.protocol === item.protocol}
          <li>
            <button
              type="button"
              aria-current={isOpen ? 'true' : undefined}
              onclick={() => actions.onOpenMine(item.protocol)}
              class={cn(
                'rounded-box focus-visible:ring-ring flex w-full cursor-pointer flex-col gap-1.5 p-3 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none',
                isOpen ? 'bg-primary-soft' : 'bg-card hover:bg-muted/60 border-border/70 border',
              )}
            >
              <span class="flex items-center justify-between gap-2">
                <span class="flex min-w-0 items-center gap-2">
                  <span class={cn('font-mono text-sm font-bold', isOpen ? 'text-primary' : 'text-foreground')}>
                    {item.protocol}
                  </span>
                  <!-- Está aqui por ter sido vinculado, não por ter aberto. -->
                  {#if item.isWatching}
                    <StatusBadge data={{ label: 'Vinculado' }} ui={{ tone: 'info', size: 'sm' }} />
                  {/if}
                </span>
                <StatusBadge
                  data={{ label: ticketStatusLabel(item.status) }}
                  ui={{ tone: ticketStatusTone(item.status), size: 'sm' }}
                />
              </span>
              <span class="text-foreground/80 line-clamp-2 text-xs">{item.description}</span>
              <span class="text-muted-foreground text-[0.6875rem]">
                {ticketAreaLabel(item.area)} · {ticketProblemTypeLabel(item.problemType)} · {formatHistoryDateTime(item.createdAt)}
              </span>
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </aside>

  <!-- DIREITA: o chamado aberto (ou o convite para abrir um). -->
  <section class={cn('flex min-w-0 flex-col gap-4', !isShowingResult && 'hidden lg:flex')} aria-label="Chamado">
    {#if isShowingResult}
      <ActionButton
        data={{ label: 'Meus chamados' }}
        ui={{ variant: 'ghost', size: 'sm', icon: ArrowLeft, className: 'w-fit lg:hidden' }}
        actions={{ onClick: actions.onBackToList }}
      />
    {/if}

    {#if viewState?.error}
      <ErrorState data={{ message: viewState.error }} ui={{ variant: 'inline' }} />
    {:else if viewState?.isNotFound}
      <!-- "Não encontrado" é resposta, não falha do site — por isso não vem em vermelho. -->
      <EmptyState
        data={{
          title: `Nenhum chamado seu com o número ${data.protocol.toUpperCase()}`,
          description: 'Confira o número que você anotou, ou escolha um dos seus na lista.',
        }}
        ui={{ icon: FileSearch }}
      />
    {:else if ticket}
      {@const facts = factsOf(ticket)}
      {@const journey = journeyOf(ticket.status)}
      <article class="rounded-surface border-border/70 bg-card flex flex-col gap-6 border p-5 shadow-xs sm:p-6">
        <header class="flex flex-col gap-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <h2 class="text-foreground font-mono text-2xl font-bold">{ticket.protocol}</h2>
            <div class="flex flex-wrap items-center gap-2">
              <StatusBadge
                data={{ label: ticketStatusLabel(ticket.status) }}
                ui={{ tone: ticketStatusTone(ticket.status) }}
              />
              <StatusBadge
                data={{ label: `Urgência ${ticketPriorityLabel(ticket.priority).toLowerCase()}` }}
                ui={{ tone: ticketPriorityTone(ticket.priority) }}
              />
            </div>
          </div>

          <!-- A TRILHA: segmentos preenchidos até onde o chamado chegou. -->
          <ol class="grid grid-cols-3 gap-2" aria-label="Em que pé está o chamado">
            {#each journey as step, index (index)}
              <li class="flex flex-col gap-1.5" aria-current={step.state === 'current' ? 'step' : undefined}>
                <span
                  class={cn(
                    'h-1.5 rounded-full',
                    step.state === 'next' ? 'bg-muted' : 'bg-primary',
                    step.state === 'current' && 'animate-pulse',
                  )}
                ></span>
                <span
                  class={cn(
                    'text-xs',
                    step.state === 'current' ? 'text-foreground font-semibold' : 'text-muted-foreground',
                  )}
                >
                  {step.label}
                </span>
              </li>
            {/each}
          </ol>
        </header>

        <dl class="grid grid-cols-2 gap-x-4 gap-y-3.5 sm:grid-cols-3">
          {#each facts as fact (fact.label)}
            <div class="flex items-start gap-2.5">
              <span class="rounded-chip bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center">
                <fact.icon class="size-4" aria-hidden="true" />
              </span>
              <div class="min-w-0">
                <dt class="text-muted-foreground text-[0.6875rem] font-semibold tracking-wider uppercase">{fact.label}</dt>
                <dd class={cn('text-foreground truncate text-sm font-medium', fact.isCode && 'font-mono')} title={fact.value}>
                  {fact.value}
                </dd>
              </div>
            </div>
          {/each}
        </dl>

        <div class="rounded-box bg-muted/40 p-4">
          <p class="text-muted-foreground mb-1 text-xs font-semibold tracking-wider uppercase">
            Aberto por {ticket.requesterName}
          </p>
          <p class="text-foreground/90 text-sm leading-relaxed whitespace-pre-line">{ticket.description}</p>
        </div>

        {#if ownFiles.length > 0 || ticket.screenshotUrl}
          <div class="flex flex-col gap-2">
            <p class="text-muted-foreground text-xs font-semibold tracking-wider uppercase">Arquivos do chamado</p>
            {#if ownFiles.length > 0}
              <AttachmentList data={{ attachments: ownFiles }} ui={{ actor: 'requester' }} />
            {/if}
            {#if ticket.screenshotUrl}
              <a
                class="control-sm rounded-control border-border bg-card text-primary hover:bg-muted inline-flex w-fit items-center gap-1.5 border text-xs font-semibold shadow-xs transition-colors"
                href={ticket.screenshotUrl}
                target="_blank"
                rel="noopener"
              >
                <ImageIcon class="size-3.5" aria-hidden="true" />
                Abrir o print enviado
              </a>
            {/if}
          </div>
        {/if}

        <!-- O ANDAMENTO: é o que a pessoa veio buscar. -->
        <div class="border-border/70 flex flex-col gap-3 border-t pt-5">
          <p class="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
            Andamento · {ticket.histories.length}
          </p>
          <HistoryTimeline
            data={{ histories: ticket.histories }}
            ui={{ emptyLabel: 'Ainda não há andamento registrado neste chamado.' }}
          />
        </div>

        {@render slots?.ticketActions?.(ticket)}
      </article>
    {:else}
      <EmptyState
        data={{
          title: 'Escolha um chamado',
          description: 'Clique num dos seus chamados ao lado, ou digite o número para consultar.',
        }}
        ui={{ icon: Inbox, className: 'min-h-96' }}
      />
    {/if}
  </section>
</div>
