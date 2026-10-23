<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { type SoftwareProject } from '@template/shared/schemas/software-project.schema';
  import { type SoftwareTimelineEvent } from '@template/shared/schemas/software-timeline.schema';
  import { type Ticket } from '@template/shared/schemas/ticket.schema';
  import { fn } from 'storybook/test';

  import {
    projectProgressOf,
    timelineDaysOf,
  } from '$lib/hooks/use-software-project-detail/use-software-project-detail.svelte';
  import ProjectDetailView from './azuos-project-detail-view.svelte';

  /* Dados INVENTADOS: nenhum nome daqui existe. */
  const project: SoftwareProject = {
    id: 1,
    name: 'Portal do Cliente',
    description: 'Interface web para acompanhamento e autoatendimento.',
    repositoryUrl: 'grupo-azuos/portal-cliente',
    githubRepoOwner: 'grupo-azuos',
    githubRepoName: 'portal-cliente',
    responsibleId: 'u-ana',
    responsibleName: 'Ana Lima',
    status: 'active',
    color: 'blue',
    openTicketsCount: 1,
    pullRequestsCount: 3,
    createdAt: '2026-01-10T08:00:00.000Z',
    updatedAt: null,
  };

  function event(over: Partial<SoftwareTimelineEvent>): SoftwareTimelineEvent {
    return {
      id: 1,
      projectId: 1,
      type: 'pr',
      externalId: '#1',
      title: '[feat](web): Tela de acompanhamento do pedido',
      description: null,
      url: 'https://github.com/grupo-azuos/portal-cliente/pull/1',
      author: 'ana-lima',
      authorName: 'Ana Lima',
      coAuthors: [],
      status: 'merged',
      eventDate: '2026-10-20T14:10:00.000Z',
      createdAt: '2026-10-20T14:10:00.000Z',
      ...over,
    };
  }

  const events: SoftwareTimelineEvent[] = [
    event({ id: 1, externalId: '#14', status: 'open', title: '[feat](web): Filtro por período', eventDate: '2026-10-22T10:00:00.000Z' }),
    event({ id: 2, type: 'merge', externalId: 'a1b2c3d', title: '[merge](web): Exporta o relatório em Excel', author: 'bia-costa', authorName: 'Bia Costa', coAuthors: ['Caio Souza'], eventDate: '2026-10-21T17:30:00.000Z' }),
    event({ id: 3, type: 'issue', externalId: '#9', status: 'open', title: '[CH-0031] Erro ao salvar o cadastro', eventDate: '2026-10-21T09:00:00.000Z' }),
    event({ id: 4, externalId: '#12', title: '[fix](backend): Corrige o total do pedido', eventDate: '2026-10-20T16:45:00.000Z' }),
  ];

  const ticket: Ticket = {
    id: 31,
    protocol: 'CH-0031',
    status: 'open',
    priority: 'high',
    requesterName: 'Bia Costa',
    area: 'sistema',
    department: 'Financeiro',
    problemType: 'bug',
    participantAreas: [],
    anydeskId: null,
    contactPhone: '62999990001',
    notifyWhatsapp: false,
    description: 'O cadastro não salva.',
    screenshotUrl: null,
    computerId: null,
    computerName: null,
    assignee: null,
    solution: null,
    createdAt: '2026-10-21T08:50:00.000Z',
    startedAt: null,
    resolvedAt: null,
    updatedAt: null,
    updatedBy: null,
  } as Ticket;

  const now = Date.parse('2026-10-23T12:00:00.000Z');
  const actions = { onFilterChange: fn(), onSync: fn(), onBack: fn(), onOpenTicket: fn() };

  const { Story } = defineMeta({
    title: 'Sistema/Projetos/ProjectDetailView',
    component: ProjectDetailView,
    tags: ['autodocs'],
  });
</script>

<!-- Um sistema em andamento: PR aberto, issue pendente, entregas na semana e um chamado. -->
<Story
  name="Default"
  args={{
    data: { project, progress: projectProgressOf(events, now), days: timelineDaysOf(events, ''), openTickets: [ticket], filter: '' },
    state: { canSync: true },
    actions,
  }}
/>

<!-- Só os merges: o trabalho juntado direto na develop, com quem fez junto. -->
<Story
  name="OnlyMerges"
  args={{
    data: { project, progress: projectProgressOf(events, now), days: timelineDaysOf(events, 'merge'), openTickets: [], filter: 'merge' },
    state: { canSync: true },
    actions,
  }}
/>

<!-- Sem GitHub vinculado: a página só mostra, sem o botão de sincronizar. -->
<Story
  name="WithoutGithubLink"
  args={{
    data: { project, progress: projectProgressOf(events, now), days: timelineDaysOf(events, ''), openTickets: [ticket], filter: '' },
    state: { canSync: false },
    actions,
  }}
/>

<!-- Caso limite: sistema recém-cadastrado, sem nada sincronizado ainda. -->
<Story
  name="Empty"
  args={{
    data: { project, progress: projectProgressOf([], now), days: [], openTickets: [], filter: '' },
    state: { canSync: true },
    actions,
  }}
/>

<Story
  name="SyncFailedOnMobile"
  globals={{ viewport: { value: 'celular' } }}
  args={{
    data: { project, progress: projectProgressOf(events, now), days: timelineDaysOf(events, ''), openTickets: [ticket], filter: '' },
    state: { canSync: true, syncError: 'O GitHub não respondeu. Tente de novo em instantes.' },
    actions,
  }}
/>
