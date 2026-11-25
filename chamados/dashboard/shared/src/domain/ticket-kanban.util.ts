import {
  availableTicketHistoryTypes,
  REQUESTER_TICKET_HISTORY_TYPES,
  TICKET_HISTORY_CATALOG,
  type ManualTicketHistoryType,
} from './ticket-history.util';
import {
  isClosedTicketStatus,
  TICKET_STATUSES,
  ticketStatusLabel,
  WAITING_TICKET_STATUSES,
  type TicketStatus,
} from './ticket-status.util';

/**
 * O QUADRO (kanban) DA FILA DE CHAMADOS — o mesmo nas três áreas (Infraestrutura, Sistema e
 * Manutenção), porque os estágios são os mesmos nas três (`ticket-status.util`).
 *
 * Uma coluna por ESTÁGIO do chamado, todos eles, na ordem do catálogo (que é a ordem em que o
 * chamado anda: fila, atendimento, espera, fim) e com o nome que a fila e a ficha já mostram.
 * Assim o que o selo do cartão diz e a coluna em que ele está são sempre a mesma palavra — e um
 * estágio novo no catálogo vira coluna sozinho.
 *
 * Mover um cartão é LANÇAR UM HISTÓRICO, como na ficha: é o único caminho que muda o estágio. Qual
 * histórico cabe sai do catálogo (`ticket-history.util`), pela mesma regra que a API usa para
 * recusar — o quadro não tem regra própria.
 */
export const TICKET_KANBAN_COLUMNS: readonly { status: TicketStatus; title: string }[] =
  TICKET_STATUSES.map((status) => ({ status, title: ticketStatusLabel(status) }));

export function ticketKanbanTitle(status: TicketStatus): string {
  return ticketStatusLabel(status);
}

/**
 * O que soltar o cartão numa coluna pede:
 *
 *  - `none`    — soltou na coluna em que ele já estava;
 *  - `refused` — nenhum histórico de quem atende leva até lá (o motivo é texto de tela);
 *  - `direct`  — um histórico só leva até lá, e ele não precisa de texto de ninguém (pegar o
 *                chamado, retomar o que esperava): o quadro lança na hora;
 *  - `dialog`  — é preciso escrever (a solução, a ressalva, o motivo do cancelamento ou da
 *                reabertura, por quem se espera): abre o formulário de histórico já no tipo que
 *                leva à coluna, e o cartão só muda depois de confirmar. Se mais de um tipo
 *                levasse ao mesmo estágio, o formulário ofereceria só esses.
 */
export type TicketKanbanMove =
  | { kind: 'none' }
  | { kind: 'refused'; message: string }
  | { kind: 'direct'; type: ManualTicketHistoryType; description: string }
  | { kind: 'dialog'; types: ManualTicketHistoryType[]; initialType: ManualTicketHistoryType };

/**
 * Os históricos que o quadro lança SOZINHO, com o texto que fica na linha do tempo. São os que só
 * dizem "estou com ele": pegar da fila e retomar o que esperava. Encerrar, cancelar, reabrir e pôr
 * em espera nunca entram — a solução, o motivo e por quem se espera são escritos por quem atende.
 */
const DIRECT_DESCRIPTIONS: Partial<Record<ManualTicketHistoryType, string>> = {
  start: 'Iniciado atendimento via Kanban.',
  resume: 'Retomado o atendimento via Kanban.',
};

/** O estágio a que só QUEM PEDIU leva o chamado (responder, reabrir pela Central). */
function isRequesterStage(target: TicketStatus): boolean {
  return REQUESTER_TICKET_HISTORY_TYPES.some((type) => TICKET_HISTORY_CATALOG[type].leadsTo === target);
}

function quoted(statuses: readonly TicketStatus[]): string {
  return statuses.map((status) => `"${ticketStatusLabel(status)}"`).join(' ou ');
}

/* Num chamado em andamento, toda coluna tem um histórico de quem atende que leva até ela — menos as
   da fila: "Aberto" é só a abertura, e "Retorno do solicitante" é de quem pediu. Encerrado, só a
   reabertura sai dele. Por isso três frases bastam. */
function refusalOf(status: TicketStatus, target: TicketStatus): string {
  if (isClosedTicketStatus(status)) {
    return `Este chamado está encerrado. Para mexer nele de novo, mova-o para "${ticketStatusLabel('in_progress')}" — é a reabertura.`;
  }
  if (isRequesterStage(target)) {
    return `"${ticketStatusLabel(target)}" é lançado por quem abriu o chamado, quando ele responde pela Central.`;
  }

  return `Um chamado não volta para "${ticketStatusLabel(target)}". Para pausá-lo, mova para ${quoted(WAITING_TICKET_STATUSES)}.`;
}

/** O que acontece ao soltar um chamado NESTE estágio na coluna do estágio `target`. */
export function ticketKanbanMove(status: TicketStatus, target: TicketStatus): TicketKanbanMove {
  if (status === target) return { kind: 'none' };

  const types = availableTicketHistoryTypes(status).filter(
    (type) => TICKET_HISTORY_CATALOG[type].leadsTo === target,
  );
  const [first] = types;
  if (!first) return { kind: 'refused', message: refusalOf(status, target) };

  const description = types.length === 1 ? DIRECT_DESCRIPTIONS[first] : undefined;
  if (description) return { kind: 'direct', type: first, description };

  return { kind: 'dialog', types, initialType: first };
}
