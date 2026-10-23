import { page } from '$app/state';
import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { type TimelineEventType } from '@template/shared/domain/software-project.util';
import { isClosedTicketStatus } from '@template/shared/domain/ticket-status.util';
import { MAX_PAGE_SIZE } from '@template/shared/schemas/pagination.schema';
import { type SoftwareProject } from '@template/shared/schemas/software-project.schema';
import { type SoftwareTimelineEvent } from '@template/shared/schemas/software-timeline.schema';
import { type Ticket } from '@template/shared/schemas/ticket.schema';
import { writable } from 'svelte/store';

import { ApiError, readError } from '$lib/api/http-client';
import { softwareProjectsApi } from '$lib/api/software-projects.api';
import { softwareTimelineApi } from '$lib/api/software-timeline.api';
import { ticketsApi } from '$lib/api/tickets.api';
import { useGithubConnectionModel } from '$lib/hooks/use-github-connection/use-github-connection.svelte';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';
import { SOFTWARE_PROJECTS_QUERY_KEY } from '$lib/hooks/use-software-project-list/use-software-project-list.svelte';
import { SOFTWARE_TIMELINE_QUERY_KEY } from '$lib/hooks/use-software-timeline/use-software-timeline.svelte';

/** O que a timeline mostra: tudo, ou um tipo de atividade do GitHub. */
export type ProjectTimelineFilter = '' | Extract<TimelineEventType, 'pr' | 'merge' | 'issue'>;

/** O andamento do sistema de relance — o que o gestor quer saber antes de ler a timeline. */
export type ProjectProgress = {
  /** PRs abertos: o que está sendo feito AGORA, esperando revisão ou merge. */
  openPullRequests: SoftwareTimelineEvent[];
  /** Issues abertas: o que está pedido e ainda não foi resolvido. */
  openIssues: SoftwareTimelineEvent[];
  /** PRs mergeados e merges locais dos últimos sete dias — o ritmo de entrega. */
  deliveredLastWeek: number;
  /** A atividade mais recente, de qualquer tipo. Nula num sistema sem nada sincronizado. */
  lastActivityAt: string | null;
};

/** Um dia da timeline, do mais recente para o mais antigo. */
export type ProjectTimelineDay = { day: string; events: SoftwareTimelineEvent[] };

const DAY_MS = 24 * 60 * 60 * 1000;
/* `sv-SE` escreve AAAA-MM-DD — o dia no fuso de quem olha, pronto para comparar como texto. */
const dayFormat = new Intl.DateTimeFormat('sv-SE');

/**
 * O andamento do sistema a partir da timeline. Exportado e puro para ter teste próprio: é ele
 * que diz ao gestor "em que etapa está", e errar aqui é mostrar trabalho parado como andando.
 */
export function projectProgressOf(
  events: readonly SoftwareTimelineEvent[],
  now: number = Date.now(),
): ProjectProgress {
  const byNewest = [...events].sort((a, b) => b.eventDate.localeCompare(a.eventDate));
  const weekAgo = now - 7 * DAY_MS;

  return {
    openPullRequests: byNewest.filter((event) => event.type === 'pr' && event.status === 'open'),
    openIssues: byNewest.filter((event) => event.type === 'issue' && event.status === 'open'),
    deliveredLastWeek: byNewest.filter(
      (event) =>
        ((event.type === 'pr' && event.status === 'merged') || event.type === 'merge') &&
        Date.parse(event.eventDate) >= weekAgo,
    ).length,
    lastActivityAt: byNewest[0]?.eventDate ?? null,
  };
}

/** A timeline agrupada por dia (no fuso de quem olha), do mais recente para o mais antigo. */
export function timelineDaysOf(
  events: readonly SoftwareTimelineEvent[],
  filter: ProjectTimelineFilter,
): ProjectTimelineDay[] {
  const visible = [...events]
    .filter((event) => !filter || event.type === filter)
    .sort((a, b) => b.eventDate.localeCompare(a.eventDate));

  return visible.reduce<ProjectTimelineDay[]>((days, event) => {
    const day = dayFormat.format(Date.parse(event.eventDate));
    const last = days.at(-1);
    if (last?.day === day) last.events.push(event);
    else days.push({ day, events: [event] });

    return days;
  }, []);
}

export type SoftwareProjectDetailModel = {
  data: {
    project: SoftwareProject | null;
    progress: ProjectProgress;
    days: ProjectTimelineDay[];
    openTickets: Ticket[];
    filter: ProjectTimelineFilter;
    /** A timeline foi cortada no teto da consulta: a tela avisa, não esconde calada. */
    isTruncated: boolean;
    syncMessage: string | null;
  };
  state: {
    isLoading: boolean;
    isMissing: boolean;
    error: string | null;
    isSyncing: boolean;
    syncError: string | null;
    /** Quem tem o GitHub vinculado sincroniza — qualquer papel, e só esses. */
    canSync: boolean;
  };
  actions: {
    onFilterChange: (filter: ProjectTimelineFilter) => void;
    onSync: () => void;
    onRetry: () => void;
  };
};

/**
 * A PÁGINA DO SISTEMA: em que etapa ele está (PRs e issues abertos, chamados em aberto) e tudo
 * o que aconteceu, numa timeline. É uma rota, e não o antigo diálogo sobre a lista, porque o
 * gestor guarda e manda o endereço — "olha como está o Paralegal".
 */
export function useSoftwareProjectDetailModel(id: number): SoftwareProjectDetailModel {
  const queryClient = useQueryClient();
  const github = useGithubConnectionModel(page.data.user?.id ?? '', Boolean(page.data.user?.id));
  let filter = $state<ProjectTimelineFilter>('');
  let syncMessage = $state<string | null>(null);

  const project = mirrorStore(
    createQuery(
      writable({
        queryKey: [...SOFTWARE_PROJECTS_QUERY_KEY, 'detail', id],
        queryFn: () => softwareProjectsApi.get(id),
        retry: false,
      }),
    ),
  );
  const timeline = mirrorStore(
    createQuery(
      writable({
        queryKey: [...SOFTWARE_TIMELINE_QUERY_KEY, id, 'all'],
        queryFn: () => softwareTimelineApi.list({ projectId: id, page: 1, pageSize: MAX_PAGE_SIZE }),
      }),
    ),
  );
  const tickets = mirrorStore(
    createQuery(
      writable({
        queryKey: ['tickets', 'list', { projectId: id, area: 'sistema' }],
        queryFn: () =>
          ticketsApi.list({ projectId: id, area: 'sistema', page: 1, pageSize: MAX_PAGE_SIZE }),
      }),
    ),
  );
  const sync = mirrorStore(
    createMutation({
      mutationFn: () => softwareProjectsApi.syncGithub(id),
      onSuccess: (result) => {
        syncMessage = result.message;
        void queryClient.invalidateQueries({ queryKey: SOFTWARE_TIMELINE_QUERY_KEY });
        void queryClient.invalidateQueries({ queryKey: SOFTWARE_PROJECTS_QUERY_KEY });
      },
    }),
  );

  return {
    get data() {
      const events = timeline.current.data?.items ?? [];

      return {
        project: project.current.data ?? null,
        progress: projectProgressOf(events),
        days: timelineDaysOf(events, filter),
        openTickets: (tickets.current.data?.items ?? []).filter(
          (ticket) => !isClosedTicketStatus(ticket.status),
        ),
        filter,
        isTruncated: (timeline.current.data?.total ?? 0) > events.length,
        syncMessage,
      };
    },
    get state() {
      const missing =
        project.current.error instanceof ApiError && project.current.error.status === 404;

      return {
        isLoading: project.current.isPending || timeline.current.isPending,
        isMissing: missing,
        error: missing ? null : readError(project.current.error ?? timeline.current.error),
        isSyncing: sync.current.isPending,
        syncError: readError(sync.current.error),
        canSync: github.state.isLinked,
      };
    },
    actions: {
      onFilterChange: (next) => (filter = next),
      onSync: () => {
        syncMessage = null;
        if (!sync.current.isPending) sync.current.mutate();
      },
      onRetry: () => {
        void project.current.refetch();
        void timeline.current.refetch();
        void tickets.current.refetch();
      },
    },
  };
}
