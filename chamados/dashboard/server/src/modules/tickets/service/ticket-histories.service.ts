import {
  Injectable,
  NotFoundException,
  Optional,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  nextTicketStatus,
  refuseRequesterTicketHistory,
  refuseTicketHistory,
  ticketHistoryTypeLabel,
} from '@template/shared/domain/ticket-history.util';
import { isClosedTicketStatus } from '@template/shared/domain/ticket-status.util';
import { type StagedFile } from '@template/shared/schemas/staged-file.schema';
import { type TicketAttachment } from '@template/shared/schemas/ticket-attachment.schema';
import {
  type CreateRequesterHistoryInput,
  createRequesterHistorySchema,
  type PublicTicketHistory,
  type TicketHistory,
} from '@template/shared/schemas/ticket-history.schema';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { type TicketHistoryRow } from '../../../lib/db/schema/ticket-histories.schema';
import { type TicketRow } from '../../../lib/db/schema/tickets.schema';
import { assertCanAttendTicket, assertCanRead } from '../../../lib/policy/policy-assert.util';
import { GithubService } from '../../software-projects/service/github.service';
import {
  type HistoryEntry,
  toHistoryInsert,
  toOpeningHistory,
  toPublicTicketHistory,
  toTicketHistory,
  toTicketMove,
} from '../mapper/ticket-histories.mapper';
import { TicketHistoriesRepository } from '../repository/ticket-histories.repository';
import { TicketsRepository } from '../repository/tickets.repository';
import { TICKET_NOT_FOUND, TicketAccessService, type TicketInReach } from './ticket-access.service';
import { TicketAttachmentsService } from './ticket-attachments.service';
import { TicketPeopleService } from './ticket-people.service';
import { TicketWhatsappNotifierService } from './ticket-whatsapp-notifier.service';

/**
 * A LINHA DO TEMPO do chamado — a ordem de serviço. É o ÚNICO caminho que muda o estágio de um
 * chamado: lançar um histórico.
 *
 * As regras de qual tipo cabe em qual estágio NÃO moram aqui: são do domínio
 * (`ticket-history.util`), e é a mesma função que o formulário usa para esconder a opção.
 */
@Injectable()
export class TicketHistoriesService {
  constructor(
    private readonly repository: TicketHistoriesRepository,
    private readonly access: TicketAccessService,
    private readonly attachments: TicketAttachmentsService,
    @Optional() private readonly github?: GithubService,
    @Optional() private readonly people?: TicketPeopleService,
    @Optional() private readonly notifier?: TicketWhatsappNotifierService,
    @Optional() private readonly tickets?: TicketsRepository,
  ) {}

  /** A linha do tempo inteira, para o painel. */
  async list(user: RequestUser, ticketId: number): Promise<TicketHistory[]> {
    assertCanRead(user.role, 'os chamados');
    await this.access.reach(user, ticketId);

    return this.timelineOf(ticketId);
  }

  /**
   * A linha do tempo que QUEM ABRIU enxerga na consulta por protocolo: só os históricos
   * marcados como visíveis, sem a identidade de quem escreveu nem o tempo gasto.
   *
   * Os arquivos entram por parâmetro porque quem chama já os leu — e é dos visíveis que eles
   * saem: o anexo de um histórico escondido fica escondido junto.
   */
  async listPublic(
    ticketId: number,
    attachments: readonly TicketAttachment[],
  ): Promise<PublicTicketHistory[]> {
    const rows = await this.repository.listByTicket(ticketId, { visibleToRequesterOnly: true });

    return withAttachments(rows, attachments).map(toPublicTicketHistory);
  }

  /** A abertura — registrada pelo sistema quando o chamado nasce. Sem policy: é pública. */
  async recordOpening(ticket: TicketRow): Promise<void> {
    await this.repository.record(toOpeningHistory(ticket));
  }

  /**
   * Lança um histórico — e, com ele, muda o estágio do chamado quando o tipo leva a outro.
   *
   * Os arquivos — já enviados pelo navegador para a área temporária — são conferidos ANTES de
   * qualquer gravação: recusar um PDF grande demais depois de o histórico existir deixaria na
   * linha do tempo um "segue a nota em anexo" sem anexo.
   */
  async create(
    user: RequestUser,
    ticketId: number,
    entry: HistoryEntry,
    files: readonly StagedFile[] = [],
    notifyUserIds: readonly string[] = [],
  ): Promise<TicketHistory> {
    assertCanAttendTicket(user.role);

    const reach = await this.access.reach(user, ticketId);
    this.access.assertCanWrite(reach);
    this.assertFits(reach, entry);
    /* Histórico novo não tem nada anexado ainda: a cota dele começa vazia. */
    const accepted = await this.attachments.accept(files, []);

    const author = { name: user.name, email: user.email, id: user.id };
    const row = await this.repository.record(
      toHistoryInsert(reach.ticket, entry, author),
      toTicketMove(reach.ticket, entry, author),
    );

    const saved = await this.attachments.store(ticketId, accepted, {
      author: user.email,
      origin: 'support',
      historyId: row.id,
    });
    this.mirrorToIssue(reach.ticket, entry, user.name);
    await this.notify(reach.ticket, row, user, notifyUserIds);

    return toTicketHistory(row, saved);
  }

  /**
   * O andamento de QUEM PEDIU (ou de alguém vinculado), pela Central: responder, mandar
   * arquivo, reabrir. É a outra porta da mesma OS — grava pela mesma função, com os tipos de
   * `origin: 'requester'`, e leva o chamado para "Retorno do solicitante".
   *
   * Quem chega aqui não precisa de módulo nenhum: basta ter aberto o chamado ou estar
   * vinculado. Qualquer outra pessoa recebe o 404 de um chamado que não existe.
   */
  async createByRequester(
    user: RequestUser,
    ticketId: number,
    input: CreateRequesterHistoryInput,
  ): Promise<PublicTicketHistory> {
    const { type, description, attachments: files, notifyUserIds } =
      createRequesterHistorySchema.parse(input);
    const ticket = await this.tickets?.findById(ticketId);
    if (!ticket || !this.people) throw new NotFoundException(TICKET_NOT_FOUND);

    const watchers = await this.people.watchersOf(ticketId);
    if (!this.people.canReply(ticket, watchers, user.id)) {
      throw new NotFoundException(TICKET_NOT_FOUND);
    }

    const refusal = refuseRequesterTicketHistory(ticket.status, type);
    if (refusal) throw new UnprocessableEntityException(refusal);
    const accepted = await this.attachments.accept(files, []);

    const entry = { type, description, isVisibleToRequester: true, minutesSpent: null };
    const author = { name: user.name, email: user.email, id: user.id };
    const row = await this.repository.record(
      toHistoryInsert(ticket, entry, author),
      toTicketMove(ticket, entry, author),
    );

    /* `requester`: o arquivo é prova de quem pediu, e é dele — o TI vê e baixa, não apaga. */
    const saved = await this.attachments.store(ticketId, accepted, {
      author: user.email,
      origin: 'requester',
      historyId: row.id,
    });
    this.mirrorToIssue(ticket, entry, user.name);
    await this.notify(ticket, row, user, notifyUserIds);

    return toPublicTicketHistory(toTicketHistory(row, saved));
  }

  /**
   * Avisa as pessoas que o autor ESCOLHEU — só as que são do chamado (quem abriu, vinculados,
   * responsável). Id de fora é descartado calado: veio de uma tela, e avisar um estranho sobre
   * o chamado alheio é vazamento. Falha de aviso nunca derruba o andamento já gravado.
   */
  private async notify(
    ticket: TicketRow,
    row: TicketHistoryRow,
    user: RequestUser,
    notifyUserIds: readonly string[],
  ): Promise<void> {
    if (notifyUserIds.length === 0 || !this.people || !this.notifier) return;

    const watchers = await this.people.watchersOf(ticket.id);
    const recipients = this.people
      .notifiableOf(ticket, watchers, user.id)
      .filter((person) => notifyUserIds.includes(person.id));

    await this.notifier.update(
      ticket,
      {
        authorId: user.id,
        authorName: user.name,
        description: row.description,
        statusAfter: row.statusAfter,
      },
      recipients,
    );
  }

  /**
   * O histórico vira COMENTÁRIO na issue do chamado, e cruzar o encerramento muda a issue junto:
   * encerrar fecha, reabrir reabre. Quem acompanha pelo GitHub vê o mesmo andamento que o painel.
   */
  private mirrorToIssue(ticket: TicketRow, entry: HistoryEntry, authorName: string): void {
    const next = nextTicketStatus(ticket.status, entry.type);
    const wasClosed = isClosedTicketStatus(ticket.status);
    const isClosed = isClosedTicketStatus(next);
    const state = wasClosed === isClosed ? undefined : isClosed ? 'closed' : 'open';

    this.github?.mirrorTicketToIssueInBackground(ticket, {
      comment: issueCommentOf(entry, authorName),
      state,
    });
  }

  /**
   * O histórico CABE neste chamado, e quem pede PODE lançá-lo?
   *
   * Cruzar a fronteira do encerramento — encerrar, ou reabrir o que estava encerrado — é
   * exclusivo de quem administra a área. A pergunta é feita pelo estágio de antes e de depois,
   * e não pelo nome do tipo: um tipo novo que encerre já nasce com a mesma trava.
   */
  private assertFits(reach: TicketInReach, entry: HistoryEntry): void {
    const current = reach.ticket.status;

    const refusal = refuseTicketHistory(current, entry.type);
    if (refusal) throw new UnprocessableEntityException(refusal);

    const next = nextTicketStatus(current, entry.type);
    if (isClosedTicketStatus(current) !== isClosedTicketStatus(next)) {
      this.access.assertCanFinalize(reach);
    }
  }

  private async timelineOf(ticketId: number): Promise<TicketHistory[]> {
    const [rows, attachments] = await Promise.all([
      this.repository.listByTicket(ticketId),
      this.attachments.list(ticketId),
    ]);

    return withAttachments(rows, attachments);
  }
}

/** Cada histórico com os arquivos que foram anexados junto dele. */
function withAttachments(
  rows: readonly TicketHistoryRow[],
  attachments: readonly TicketAttachment[],
): TicketHistory[] {
  return rows.map((row) =>
    toTicketHistory(
      row,
      attachments.filter((attachment) => attachment.historyId === row.id),
    ),
  );
}

/** O comentário na issue: o que foi lançado, por quem, e o texto como a pessoa escreveu. */
export function issueCommentOf(entry: HistoryEntry, authorName: string): string {
  const header = `**${ticketHistoryTypeLabel(entry.type)}** — ${authorName}`;
  const text = entry.description.trim();

  return text ? `${header}\n\n${text}` : header;
}
