<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { type Ticket } from '@template/shared/schemas/ticket.schema';
  import { fn } from 'storybook/test';

  import TicketKanbanBoard from './azuos-ticket-kanban-board.svelte';

  function mockTicket(partial: Partial<Ticket> & Pick<Ticket, 'id' | 'protocol' | 'description'>): Ticket {
    return {
      status: 'open',
      priority: 'medium',
      requesterName: 'Ana Souza',
      area: 'sistema',
      department: 'financeiro',
      problemType: 'bug',
      participantAreas: [],
      anydeskId: null,
      contactPhone: null,
      notifyWhatsapp: false,
      screenshotUrl: null,
      computerId: null,
      computerName: null,
      projectId: 1,
      projectName: 'Azuos Ticket',
      githubIssueNumber: null,
      githubIssueUrl: null,
      assignee: null,
      solution: null,
      createdAt: '2026-10-06T12:00:00.000Z',
      startedAt: null,
      resolvedAt: null,
      updatedAt: null,
      updatedBy: null,
      ...partial,
    };
  }

  const mockColumns = [
    {
      id: 'queue' as const,
      title: 'A fazer / triagem',
      tickets: [
        mockTicket({
          id: 10,
          protocol: 'CH-0010',
          description: 'Erro na autenticação do sistema',
          priority: 'high',
          projectName: 'Azuos Ticket',
          requesterName: 'Ana Souza',
          githubIssueNumber: 42,
          githubIssueUrl: 'https://github.com/issue/42',
          createdAt: '2026-10-06T12:00:00.000Z',
        }),
      ],
    },
    {
      id: 'working' as const,
      title: 'Em atendimento',
      tickets: [
        mockTicket({
          id: 11,
          protocol: 'CH-0011',
          description: 'Refatoração da sincronização de PRs',
          priority: 'medium',
          projectName: 'Azuos Ticket',
          requesterName: 'Carlos Dev',
          assignee: 'Bruno Lima',
          assigneeId: 'u-bruno',
          githubIssueNumber: null,
          githubIssueUrl: null,
          createdAt: '2026-10-05T15:00:00.000Z',
        }),
      ],
    },
    {
      id: 'waiting' as const,
      title: 'Aguardando',
      tickets: [
        mockTicket({
          id: 12,
          status: 'waiting_third_party',
          protocol: 'CH-0012',
          description: 'Integração com o banco devolvendo erro 500 no fechamento do mês',
          priority: 'high',
          customSystemName: 'Planilha do financeiro',
          projectId: null,
          projectName: null,
          assignee: 'Bruno Lima',
          assigneeId: 'u-bruno',
        }),
      ],
    },
    { id: 'closed' as const, title: 'Concluído', tickets: [] },
  ];

  const baseData = {
    columns: mockColumns,
    cardColors: { 12: 'danger' },
    assigneePhotos: { 'u-bruno': null },
  };

  const baseState = { isMoving: false, moveError: null };

  const baseActions = {
    onOpenTicket: fn(),
    onMoveTicket: fn(),
    onSetCardColor: fn(),
  };

  const { Story } = defineMeta({
    title: 'Components/AzuosTicketKanbanBoard',
    component: TicketKanbanBoard,
    parameters: { layout: 'padded' },
  });
</script>

<Story
  name="Default"
  args={{
    data: baseData,
    state: baseState,
    actions: baseActions,
  }}
/>

<!-- Com uma mudança de etapa indo para o servidor e o aviso do quadro. -->
<Story
  name="MovingWithNotice"
  args={{
    data: baseData,
    state: { ...baseState, isMoving: true, moveError: 'Um chamado já iniciado não volta para "A fazer".' },
    actions: { ...baseActions, onClearMoveError: fn() },
  }}
/>

<!-- Quem só consulta a área: o quadro aparece, mas nenhum cartão se arrasta. -->
<Story
  name="ReadOnly"
  args={{
    data: { ...baseData, lockedTicketIds: [10, 11, 12] },
    state: baseState,
    actions: baseActions,
  }}
/>

<!-- Um chamado de Manutenção: sem sistema e sem issue, o selo do cartão é o tipo de problema. -->
<Story
  name="OtherArea"
  args={{
    data: {
      ...baseData,
      columns: [
        {
          id: 'queue' as const,
          title: 'A fazer / triagem',
          tickets: [
            mockTicket({
              id: 20,
              protocol: 'CH-0020',
              description: 'Ar-condicionado da sala 3 pingando',
              area: 'manutencao',
              problemType: 'other',
              projectId: null,
              projectName: null,
            }),
          ],
        },
        { id: 'working' as const, title: 'Em atendimento', tickets: [] },
        { id: 'waiting' as const, title: 'Aguardando', tickets: [] },
        { id: 'closed' as const, title: 'Concluído', tickets: [] },
      ],
    },
    state: baseState,
    actions: baseActions,
  }}
/>

<!-- Caso limite: nenhum chamado no recorte (a fila mostra o vazio antes; aqui, o quadro sozinho). -->
<Story
  name="EmptyColumns"
  args={{
    data: {
      ...baseData,
      columns: mockColumns.map((column) => ({ ...column, tickets: [] })),
    },
    state: baseState,
    actions: baseActions,
  }}
/>
