<!--
  @component
  UM CHAMADO NA GRADE DE CARDS da fila — nas três áreas (Infraestrutura, Sistema e Manutenção),
  sobre o `AzuosRecordCard`, o mesmo cartão da máquina e do cartão de empresa do Paralegal.

  - A FAIXA: a situação do chamado (bolinha + texto no tom) e, à direita, a urgência.
  - O ÍCONE CHEIO é o tipo de problema ("Impressora", "Ar-condicionado"), no tom da situação.
  - O título é quem abriu; embaixo o protocolo em mono e o departamento.
  - As TRÊS CAIXINHAS: área, tipo e máquina (traço quando ninguém vinculou ainda).
  - O RODAPÉ: o responsável, com a foto, e quando o chamado foi aberto, com "Abrir".

  O card inteiro é o botão que abre a ficha. Mudar de etapa é na ficha, lançando um histórico —
  daqui só se abre.

  - `data`: `ticket` e `assigneePhoto` (a foto de quem atende; sem ela, as iniciais).
  - `ui.className`: classes extras.
  - `actions.onOpen(ticket)`: abrir a ficha.
-->
<script lang="ts" module>
  import { type Ticket } from '@template/shared/schemas/ticket.schema';

  export type AzuosTicketCardProps = {
    data: { ticket: Ticket; assigneePhoto?: string | null };
    ui?: { className?: string };
    actions: { onOpen: (ticket: Ticket) => void };
  };
</script>

<script lang="ts">
  import {
    ticketAreaLabel,
    ticketDepartmentLabel,
    ticketProblemTypeLabel,
  } from '@template/shared/domain/ticket-catalog.util';
  import {
    ticketPriorityLabel,
    ticketPriorityTone,
    ticketStatusLabel,
    ticketStatusTone,
  } from '@template/shared/domain/ticket-status.util';

  import RecordCard from '$lib/components/azuos-record-card/azuos-record-card.svelte';
  import { formatDate } from '$lib/utils/format-date';
  import { ticketProblemIconOf } from '$lib/utils/record-icon.util';

  let { data, ui, actions }: AzuosTicketCardProps = $props();

  const ticket = $derived(data.ticket);
  const statusTone = $derived(ticketStatusTone(ticket.status));
  const problemType = $derived(ticketProblemTypeLabel(ticket.problemType));
</script>

<RecordCard
  data={{
    label: `Abrir o chamado ${ticket.protocol} — ${ticket.requesterName}`,
    title: ticket.requesterName,
    code: ticket.protocol,
    meta: ticketDepartmentLabel(ticket.department),
    status: { label: ticketStatusLabel(ticket.status), tone: statusTone },
    tags: [{ label: ticketPriorityLabel(ticket.priority), tone: ticketPriorityTone(ticket.priority) }],
    /* A maioria dos chamados não tem máquina: quem atende é que vincula. O traço diz "ainda não
       vinculado" sem virar um vazio que parece defeito de tela. */
    metrics: [
      { key: 'area', label: 'Área', value: ticketAreaLabel(ticket.area), isText: true },
      { key: 'type', label: 'Tipo', value: problemType, isText: true },
      { key: 'machine', label: 'Máquina', value: ticket.computerName ?? '—', isText: true },
    ],
    footer: {
      title: ticket.assignee ?? 'Sem responsável',
      subtitle: `Aberto em ${formatDate(ticket.createdAt)}`,
      person: ticket.assignee
        ? { id: ticket.assigneeId ?? null, name: ticket.assignee, avatarUrl: data.assigneePhoto ?? null }
        : null,
    },
    openLabel: 'Abrir',
  }}
  ui={{
    icon: ticketProblemIconOf(ticket.problemType),
    iconTone: statusTone,
    iconLabel: problemType,
    slot: 'ticket-card',
    className: ui?.className,
  }}
  actions={{ onOpen: () => actions.onOpen(ticket) }}
/>
