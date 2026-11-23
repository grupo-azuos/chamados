import { refuseTicketHistory, type TicketHistoryType } from './ticket-history.util';
import { isClosedTicketStatus, type TicketStatus } from './ticket-status.util';

/**
 * ISSUE E CHAMADO SÃO 1:1 — o que acontece numa vale para o outro.
 *
 * O lado chamado → issue já existe (encerrar o chamado fecha a issue, reabrir reabre). Este é o
 * lado issue → chamado, lido do webhook do GitHub: fechar a issue encerra o chamado com o texto
 * de quem fechou; reabrir a issue reabre o chamado.
 *
 * O eco é o cuidado principal: quando o PRÓPRIO sistema fecha a issue, o GitHub manda o aviso de
 * volta. Por isso a regra olha o estágio ATUAL do chamado — chamado já encerrado não é encerrado
 * de novo, chamado aberto não é reaberto. Sem estado nenhum guardado, o eco morre sozinho.
 */
export type GithubIssueEvent = {
  /** O `action` do evento `issues`: `closed`, `reopened`, `edited`… */
  action: string;
  /** `completed` ou `not_planned` (o "Close as not planned" do GitHub). */
  stateReason: string | null;
  issueNumber: number;
  senderLogin: string;
  /** O comentário com que a issue foi fechada, quando houver. */
  closingComment: string | null;
};

export type TicketHistoryFromIssue = { type: TicketHistoryType; description: string };

export function ticketHistoryOfIssueEvent(
  event: GithubIssueEvent,
  ticketStatus: TicketStatus,
): TicketHistoryFromIssue | null {
  const entry = entryOf(event, ticketStatus);
  if (!entry) return null;

  /* A mesma régua do formulário: tipo que não cabe no estágio de agora não entra. */
  return refuseTicketHistory(ticketStatus, entry.type) ? null : entry;
}

function entryOf(event: GithubIssueEvent, status: TicketStatus): TicketHistoryFromIssue | null {
  const who = `@${event.senderLogin}`;

  if (event.action === 'closed') {
    if (isClosedTicketStatus(status)) return null;
    /* "Close as not planned" é desistência, não solução: vira cancelamento. */
    const type = event.stateReason === 'not_planned' ? 'cancellation' : 'resolution';
    const comment = event.closingComment?.trim();
    const fallback =
      type === 'cancellation'
        ? `Issue #${event.issueNumber} fechada no GitHub como "não planejada" por ${who}.`
        : `Issue #${event.issueNumber} fechada no GitHub por ${who}.`;

    return { type, description: comment || fallback };
  }

  if (event.action === 'reopened') {
    if (!isClosedTicketStatus(status)) return null;

    return {
      type: 'reopening',
      description: `Issue #${event.issueNumber} reaberta no GitHub por ${who}.`,
    };
  }

  return null;
}
