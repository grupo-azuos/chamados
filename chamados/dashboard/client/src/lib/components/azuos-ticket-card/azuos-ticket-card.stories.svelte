<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { type Ticket } from '@template/shared/schemas/ticket.schema';
  import { fn } from 'storybook/test';

  import TicketCard from './azuos-ticket-card.svelte';

  function ticket(overrides: Partial<Ticket> = {}): Ticket {
    return {
      id: 10,
      protocol: 'CH-0010',
      status: 'in_progress',
      priority: 'high',
      requesterName: 'Ana Souza',
      area: 'infra',
      department: 'Comercial',
      problemType: 'printer',
      participantAreas: [],
      anydeskId: null,
      contactPhone: null,
      notifyWhatsapp: false,
      description: 'A impressora do segundo andar não puxa papel',
      screenshotUrl: null,
      computerId: 3,
      computerName: 'COMERCIAL-02',
      assignee: 'Carlos Lima',
      assigneeId: 'u-carlos',
      solution: null,
      createdAt: '2026-10-06T12:00:00.000Z',
      startedAt: null,
      resolvedAt: null,
      updatedAt: null,
      updatedBy: null,
      ...overrides,
    };
  }

  const actions = { onOpen: fn() };
  const { Story } = defineMeta({
    title: 'Features/Tickets/AzuosTicketCard',
    component: TicketCard,
    tags: ['autodocs'],
  });
</script>

<!-- Em atendimento, com máquina e responsável. -->
<Story name="Default" args={{ data: { ticket: ticket() }, ui: { className: 'w-80' }, actions }} />
<!-- Com a foto de quem atende, vinda do diretório. -->
<Story
  name="ComFotoDoResponsavel"
  args={{ data: { ticket: ticket(), assigneePhoto: 'https://i.pravatar.cc/64?img=12' }, ui: { className: 'w-80' }, actions }}
/>
<!-- Recém-aberto: sem responsável e sem máquina — o traço diz "ainda não vinculado". -->
<Story
  name="AbertoSemResponsavel"
  args={{
    data: { ticket: ticket({ status: 'open', priority: 'low', assignee: null, assigneeId: null, computerId: null, computerName: null }) },
    ui: { className: 'w-80' },
    actions,
  }}
/>
<!-- Manutenção: o ícone é o do tipo de problema. -->
<Story
  name="Manutencao"
  args={{
    data: { ticket: ticket({ area: 'manutencao', problemType: 'air_conditioning', status: 'resolved', computerId: null, computerName: null }) },
    ui: { className: 'w-80' },
    actions,
  }}
/>
<!-- CASO LIMITE: tipo cadastrado na hora e nomes compridos. -->
<Story
  name="NomesCompridos"
  args={{
    data: {
      ticket: ticket({
        requesterName: 'Isabela Marques de Oliveira e Souza Rodrigues',
        department: 'Departamento de Relações Institucionais',
        problemType: 'Planilha do RH que trava ao abrir',
        computerName: 'PARALEGAL-08-ESTACAO-COMPARTILHADA',
        status: 'waiting_third_party',
        assignee: 'Fernanda Albuquerque Cavalcanti',
      }),
    },
    ui: { className: 'w-72' },
    actions,
  }}
/>
