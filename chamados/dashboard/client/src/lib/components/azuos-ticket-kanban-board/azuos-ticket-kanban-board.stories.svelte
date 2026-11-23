<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { TICKET_KANBAN_COLUMNS } from '@template/shared/domain/ticket-kanban.util';
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

  /* Uma coluna por estágio do catálogo, como a fila entrega: cada chamado na coluna do seu. */
  function columnsOf(tickets: Ticket[]) {
    return TICKET_KANBAN_COLUMNS.map((column) => ({
      id: column.status,
      title: column.title,
      tickets: tickets.filter((ticket) => ticket.status === column.status),
    }));
  }

  const mockColumns = columnsOf([
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
    mockTicket({
      id: 13,
      status: 'requester_reply',
      protocol: 'CH-0013',
      description: 'Mandei o print do erro que aparece ao salvar',
      requesterName: 'Paula Reis',
    }),
    mockTicket({
      id: 11,
      status: 'in_progress',
      protocol: 'CH-0011',
      description: 'Refatoração da sincronização de PRs',
      priority: 'medium',
      projectName: 'Azuos Ticket',
      requesterName: 'Carlos Dev',
      assignee: 'Bruno Lima',
      assigneeId: 'u-bruno',
      createdAt: '2026-10-05T15:00:00.000Z',
    }),
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
    mockTicket({
      id: 14,
      status: 'resolved',
      protocol: 'CH-0014',
      description: 'Relatório de vendas sem o filtro de mês',
      assignee: 'Bruno Lima',
      assigneeId: 'u-bruno',
    }),
    mockTicket({
      id: 15,
      status: 'cancelled',
      protocol: 'CH-0015',
      description: 'Aberto em duplicidade',
      priority: 'low',
    }),
  ]);

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

<!-- Todos os estágios, cada um na sua coluna: as que não cabem rolam para o lado. -->
<Story
  name="Default"
  args={{
    data: baseData,
    state: baseState,
    actions: baseActions,
  }}
/>

<!-- Com uma mudança de estágio indo para o servidor e o aviso do quadro. -->
<Story
  name="MovingWithNotice"
  args={{
    data: baseData,
    state: { ...baseState, isMoving: true, moveError:
        'Um chamado não volta para "Aberto". Para pausá-lo, mova para "Aguardando solicitante" ou "Aguardando terceiro".' },
    actions: { ...baseActions, onClearMoveError: fn() },
  }}
/>

<!-- Quem só consulta a área: o quadro aparece, mas nenhum cartão se arrasta. -->
<Story
  name="ReadOnly"
  args={{
    data: { ...baseData, lockedTicketIds: [10, 11, 12, 13, 14, 15] },
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
      columns: columnsOf([
        mockTicket({
          id: 20,
          protocol: 'CH-0020',
          description: 'Ar-condicionado da sala 3 pingando',
          area: 'manutencao',
          problemType: 'other',
          projectId: null,
          projectName: null,
        }),
      ]),
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
