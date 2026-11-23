<script module lang="ts">
  import CircleCheck from '@lucide/svelte/icons/circle-check';
  import CircleDot from '@lucide/svelte/icons/circle-dot';
  import Wrench from '@lucide/svelte/icons/wrench';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { type Ticket } from '@template/shared/schemas/ticket.schema';
  import { fn } from 'storybook/test';

  import TicketCard from './azuos-system-ticket-card.svelte';

  const ticket: Ticket = {
    id: 10,
    protocol: 'CH-0010',
    status: 'open',
    priority: 'high',
    requesterName: 'Ana Souza',
    area: 'sistema',
    department: 'Comercial',
    problemType: 'bug',
    participantAreas: [],
    anydeskId: null,
    contactPhone: null,
    notifyWhatsapp: false,
    description: 'Erro na autenticação do sistema ao entrar pelo celular',
    screenshotUrl: null,
    computerId: null,
    computerName: null,
    projectId: 1,
    projectName: 'Azuos Ticket',
    githubIssueNumber: 42,
    githubIssueUrl: 'https://github.com/issue/42',
    assignee: 'Carlos Dev',
    assigneeId: 'u-carlos',
    solution: null,
    createdAt: '2026-10-06T12:00:00.000Z',
    startedAt: null,
    resolvedAt: null,
    updatedAt: null,
    updatedBy: null,
  };

  const actions = { onOpen: fn(), onSetLabel: fn() };

  const { Story } = defineMeta({
    title: 'Features/System/AzuosSystemTicketCard',
    component: TicketCard,
    parameters: { layout: 'padded' },
  });
</script>

<Story name="Default" asChild>
  <div class="w-80">
    <TicketCard data={{ ticket, label: null, assigneePhoto: null }} ui={{ icon: CircleDot, tone: 'neutral' }} {actions} />
  </div>
</Story>

<!-- Com etiqueta, na coluna "Em Atendimento". -->
<Story name="WithLabel" asChild>
  <div class="w-80">
    <TicketCard data={{ ticket: { ...ticket, priority: 'high' }, label: 'danger', assigneePhoto: null }} ui={{ icon: Wrench, tone: 'info' }} {actions} />
  </div>
</Story>

<Story name="Saving" asChild>
  <div class="w-80">
    <TicketCard data={{ ticket, label: null, assigneePhoto: null }} ui={{ icon: Wrench, tone: 'info' }} state={{ isBusy: true }} {actions} />
  </div>
</Story>

<!-- Caso limite: sem sistema, sem issue, sem responsável e texto comprido. -->
<Story name="Bare" asChild>
  <div class="w-80">
    <TicketCard
      data={{
        ticket: {
          ...ticket,
          projectName: null,
          githubIssueNumber: null,
          githubIssueUrl: null,
          assignee: null,
          assigneeId: null,
          priority: 'low',
          description:
            'Quando o relatório mensal é exportado com mais de mil linhas, a planilha sai com as colunas trocadas e os totais em branco no fim.',
        },
        label: null,
        assigneePhoto: null,
      }}
      ui={{ icon: CircleCheck, tone: 'success' }}
      {actions}
    />
  </div>
</Story>
