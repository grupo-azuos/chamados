import {
  availableTicketHistoryTypes,
  TICKET_HISTORY_CATALOG,
  type ManualTicketHistoryType,
} from './ticket-history.util';
import { ticketStatusPhase, type TicketPhase, type TicketStatus } from './ticket-status.util';

/**
 * O QUADRO (kanban) DA FILA DE CHAMADOS — o mesmo nas três áreas (Infraestrutura, Sistema e
 * Manutenção), porque os estágios são os mesmos nas três (`ticket-status.util`).
 *
 * Uma coluna por MOMENTO do chamado (`TicketPhase`), e não por estágio: oito estágios lado a lado
 * dariam oito colunas estreitas, e "aguardando solicitante" e "aguardando terceiro" são, para quem
 * olha o quadro, a mesma pergunta — o que está parado esperando alguém.
 *
 * Mover um cartão é LANÇAR UM HISTÓRICO, como na ficha: é o único caminho que muda o estágio. Qual
 * histórico cabe sai do catálogo (`ticket-history.util`), pela mesma regra que a API usa para
 * recusar — o quadro não tem regra própria.
 */
export const TICKET_KANBAN_COLUMNS = [
  { phase: 'queue', title: 'A fazer / triagem' },
  { phase: 'working', title: 'Em atendimento' },
  { phase: 'waiting', title: 'Aguardando' },
  { phase: 'closed', title: 'Concluído' },
] as const satisfies readonly { phase: TicketPhase; title: string }[];

export function ticketKanbanTitle(phase: TicketPhase): string {
  return TICKET_KANBAN_COLUMNS.find((column) => column.phase === phase)?.title ?? phase;
}

/**
 * O que soltar o cartão numa coluna pede:
 *
 *  - `none`    — soltou na coluna em que ele já estava;
 *  - `refused` — nenhum histórico leva até lá (o motivo é texto de tela);
 *  - `direct`  — um histórico só leva até lá, e ele não precisa de texto de ninguém (pegar o
 *                chamado, retomar o que esperava): o quadro lança na hora;
 *  - `dialog`  — é preciso escolher ou escrever (a solução, o motivo da reabertura, por quem se
 *                espera): abre o formulário de histórico, e o cartão só muda depois de confirmar.
 */
export type TicketKanbanMove =
  | { kind: 'none' }
  | { kind: 'refused'; message: string }
  | { kind: 'direct'; type: ManualTicketHistoryType; description: string }
  | { kind: 'dialog'; types: ManualTicketHistoryType[]; initialType: ManualTicketHistoryType };

/**
 * Os históricos que o quadro lança SOZINHO, com o texto que fica na linha do tempo. São os que só
 * dizem "estou com ele": pegar da fila e retomar o que esperava. Encerrar, reabrir e pôr em espera
 * nunca entram — a solução, o motivo e por quem se espera são escritos por quem atende.
 */
const DIRECT_DESCRIPTIONS: Partial<Record<ManualTicketHistoryType, string>> = {
  start: 'Iniciado atendimento via Kanban.',
  resume: 'Retomado o atendimento via Kanban.',
};

function phaseItLeadsTo(type: ManualTicketHistoryType): TicketPhase | null {
  const leadsTo = TICKET_HISTORY_CATALOG[type].leadsTo;

  return leadsTo === null ? null : ticketStatusPhase(leadsTo);
}

/* Num chamado em andamento, toda coluna tem um histórico que leva até ela — menos a fila, que só
   quem pediu devolve. Encerrado, só a reabertura sai dele. Por isso duas frases bastam. */
function refusalOf(current: TicketPhase): string {
  if (current === 'closed') {
    return 'Este chamado está encerrado. Para mexer nele de novo, mova-o para "Em atendimento" — é a reabertura.';
  }

  return 'Um chamado já iniciado não volta para "A fazer". Para pausá-lo, mova para "Aguardando".';
}

/** O que acontece ao soltar um chamado NESTE estágio na coluna `target`. */
export function ticketKanbanMove(status: TicketStatus, target: TicketPhase): TicketKanbanMove {
  const current = ticketStatusPhase(status);
  if (current === target) return { kind: 'none' };

  const types = availableTicketHistoryTypes(status).filter((type) => phaseItLeadsTo(type) === target);
  const [first] = types;
  if (!first) return { kind: 'refused', message: refusalOf(current) };

  const description = types.length === 1 ? DIRECT_DESCRIPTIONS[first] : undefined;
  if (description) return { kind: 'direct', type: first, description };

  return { kind: 'dialog', types, initialType: first };
}
