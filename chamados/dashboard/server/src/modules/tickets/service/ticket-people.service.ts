import { Inject, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { type TicketPerson } from '@template/shared/schemas/ticket-person.schema';
import { type DirectoryUser } from '@template/shared/schemas/user.schema';

import { type UserDirectoryProvider } from '../../../lib/auth/user-directory.type';
import { USER_DIRECTORY_PROVIDER } from '../../../lib/auth/user-directory.token';
import { type TicketRow } from '../../../lib/db/schema/tickets.schema';
import { toUpdateHistory, type HistoryAuthor } from '../mapper/ticket-histories.mapper';
import { toTicketPerson } from '../mapper/tickets.mapper';
import { TicketHistoriesRepository } from '../repository/ticket-histories.repository';
import { TicketWatchersRepository, type WatcherToAdd } from '../repository/ticket-watchers.repository';

/**
 * AS PESSOAS DE UM CHAMADO — quem abriu e quem está VINCULADO (a "OS com envolvidos" do Tasy).
 *
 * Mora num serviço próprio porque três portas fazem as mesmas perguntas: abrir o chamado
 * (vincular na abertura), a consulta da Central (quem vê e quem escreve) e a linha do tempo
 * (quem pode ser avisado). Com a regra copiada em cada uma, a primeira correção deixaria as
 * outras para trás.
 *
 * Quem pode ser vinculado: QUALQUER pessoa ativa do admin-console. Quem pode mexer na lista é
 * regra de quem chama (o `TicketsService`), não daqui.
 */
@Injectable()
export class TicketPeopleService {
  constructor(
    @Inject(USER_DIRECTORY_PROVIDER) private readonly directory: UserDirectoryProvider,
    private readonly watchers: TicketWatchersRepository,
    private readonly histories: TicketHistoriesRepository,
  ) {}

  /** Todas as pessoas ativas do admin-console, em ordem alfabética — o seletor de vínculo. */
  async options(): Promise<TicketPerson[]> {
    const users = await this.directory.listUsers();

    return users
      .filter((user) => !user.banned)
      .map((user) => ({ id: user.id, name: displayName(user) }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }

  /** As pessoas vinculadas a um chamado. */
  async watchersOf(ticketId: number): Promise<TicketPerson[]> {
    return (await this.watchers.listByTicket(ticketId)).map(toTicketPerson);
  }

  /** Os chamados em que a pessoa está vinculada. */
  ticketIdsOf(userId: string): Promise<number[]> {
    return this.watchers.ticketIdsOf(userId);
  }

  /**
   * Esta pessoa pode ESCREVER no chamado pela Central — quem abriu, ou alguém vinculado?
   * A lista já lida entra por parâmetro para não ir duas vezes ao banco.
   */
  canReply(ticket: TicketRow, watchers: readonly TicketPerson[], userId: string): boolean {
    if (ticket.requesterId && ticket.requesterId === userId) return true;

    return watchers.some((watcher) => watcher.id === userId);
  }

  /**
   * Quem pode receber AVISO de um andamento: quem abriu, os vinculados e o responsável, sem
   * repetir e sem quem está escrevendo (avisar a si mesmo é barulho).
   */
  notifiableOf(
    ticket: TicketRow,
    watchers: readonly TicketPerson[],
    authorId: string,
  ): TicketPerson[] {
    const candidates: TicketPerson[] = [
      ...(ticket.requesterId ? [{ id: ticket.requesterId, name: ticket.requesterName }] : []),
      ...watchers,
      ...(ticket.assigneeId ? [{ id: ticket.assigneeId, name: ticket.assignee ?? 'Responsável' }] : []),
    ];
    const seen = new Set<string>([authorId]);

    return candidates.filter((person) => {
      if (seen.has(person.id)) return false;
      seen.add(person.id);

      return true;
    });
  }

  /**
   * Vincula as pessoas na ABERTURA. Quem abriu não entra na própria lista: ele já é do
   * chamado por ter aberto, e aparecer duas vezes confundiria quem lê.
   */
  async attachOnOpening(ticket: TicketRow, ids: readonly string[], createdBy: string): Promise<void> {
    const people = await this.resolve(ids.filter((id) => id !== ticket.requesterId));

    await this.watchers.add(ticket.id, people, createdBy);
  }

  /**
   * Troca a lista inteira de vinculados — e a troca vira um histórico de "Alteração de dados",
   * com quem entrou e quem saiu. A linha do tempo é a memória do chamado: "quem colocou o
   * Financeiro nisso?" precisa ter resposta.
   */
  async replace(
    ticket: TicketRow,
    ids: readonly string[],
    author: HistoryAuthor,
  ): Promise<TicketPerson[]> {
    const current = await this.watchersOf(ticket.id);
    const wanted = await this.resolve(ids.filter((id) => id !== ticket.requesterId));

    const added = wanted.filter((person) => !current.some((watcher) => watcher.id === person.userId));
    const removed = current.filter((watcher) => !wanted.some((person) => person.userId === watcher.id));
    if (added.length === 0 && removed.length === 0) return current;

    await this.watchers.add(ticket.id, added, author.email);
    await this.watchers.remove(
      ticket.id,
      removed.map((watcher) => watcher.id),
    );
    /* Visível para quem pediu, ao contrário das outras alterações de dados: quem entrou e quem
       saiu do chamado é assunto de todos os envolvidos. */
    await this.histories.record({
      ...toUpdateHistory(ticket, describeChange(added, removed), author),
      isVisibleToRequester: true,
    });

    return this.watchersOf(ticket.id);
  }

  /**
   * Os ids viram pessoas DO DIRETÓRIO — o id vem de uma tela e não é de confiança, e o nome
   * guardado é o do admin-console, não o que a tela mandou. Id desconhecido recusa tudo:
   * vincular "metade" calado deixaria alguém de fora achando que foi incluído.
   */
  private async resolve(ids: readonly string[]): Promise<WatcherToAdd[]> {
    if (ids.length === 0) return [];

    const byId = new Map((await this.options()).map((person) => [person.id, person]));
    const unknown = ids.filter((id) => !byId.has(id));
    if (unknown.length > 0) {
      throw new UnprocessableEntityException(
        'Alguma das pessoas escolhidas não está mais ativa. Atualize a lista e escolha de novo.',
      );
    }

    return ids.map((id) => ({ userId: id, userName: byId.get(id)?.name ?? id }));
  }
}

/** "Vinculou: Ana, Bia. Desvinculou: Caio." — o texto do histórico da troca. */
export function describeChange(
  added: readonly WatcherToAdd[],
  removed: readonly TicketPerson[],
): string {
  const parts: string[] = [];
  if (added.length > 0) parts.push(`Vinculou: ${added.map((person) => person.userName).join(', ')}.`);
  if (removed.length > 0) parts.push(`Desvinculou: ${removed.map((person) => person.name).join(', ')}.`);

  return parts.join(' ');
}

function displayName(user: DirectoryUser): string {
  return user.name.trim() || user.email;
}
