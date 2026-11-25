import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, isNotNull, isNull } from 'drizzle-orm';

import { archiveValues } from '../../../lib/db/archive.util';
import { runQuery } from '../../../lib/db/db-error.util';
import { DB } from '../../../lib/db/db.token';
import { type Database } from '../../../lib/db/db.type';
import {
  ticketAttachments,
  type TicketAttachmentInsert,
  type TicketAttachmentRow,
} from '../../../lib/db/schema/ticket-attachments.schema';

/**
 * Os arquivos de um chamado, no banco.
 *
 * Só o cadastro passa por aqui: o ARQUIVO em si vive no storage, e quem fala com ele é o
 * `FileStorage` (`lib/storage`). A ordem é sempre a de chegada — quem abre a lista está lendo a história do
 * chamado, e história se lê do começo.
 */
@Injectable()
export class TicketAttachmentsRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  async listByTicket(ticketId: number): Promise<TicketAttachmentRow[]> {
    return runQuery(
      this.db
        .select()
        .from(ticketAttachments)
        .where(and(eq(ticketAttachments.ticketId, ticketId), isNull(ticketAttachments.archivedAt)))
        .orderBy(asc(ticketAttachments.id)),
      'ler os anexos do chamado',
    );
  }

  /** Os anexos excluídos do chamado — o bloco "Removidos". */
  async listArchived(ticketId: number): Promise<TicketAttachmentRow[]> {
    return runQuery(
      this.db
        .select()
        .from(ticketAttachments)
        .where(and(eq(ticketAttachments.ticketId, ticketId), isNotNull(ticketAttachments.archivedAt)))
        .orderBy(desc(ticketAttachments.archivedAt)),
      'ler os anexos excluídos do chamado',
    );
  }

  async insert(input: TicketAttachmentInsert): Promise<TicketAttachmentRow> {
    const [row] = await runQuery(
      this.db.insert(ticketAttachments).values(input).returning(),
      'guardar o anexo',
    );

    /* O `insert ... returning` de uma linha sempre devolve uma. O TypeScript não sabe disso, e
       um `!` aqui esconderia o dia em que a consulta mudar de forma. */
    if (!row) throw new Error('insert returned no attachment row');

    return row;
  }

  /**
   * Busca um anexo DENTRO de um chamado.
   *
   * Os dois identificadores juntos, e não só o do anexo: assim não existe caminho em que
   * alguém apague o anexo de um chamado passando o id de outro.
   */
  async findInTicket(ticketId: number, attachmentId: number): Promise<TicketAttachmentRow | null> {
    const [row] = await runQuery(
      this.db
        .select()
        .from(ticketAttachments)
        .where(
          and(eq(ticketAttachments.ticketId, ticketId), eq(ticketAttachments.id, attachmentId)),
        )
        .limit(1),
      'abrir o anexo',
    );

    return row ?? null;
  }

  /** Exclui (arquiva) ou desfaz (desarquiva). A linha e o arquivo no bucket ficam. */
  async setArchived(attachmentId: number, archived: boolean, actorId: string | null): Promise<void> {
    await runQuery(
      this.db
        .update(ticketAttachments)
        .set(archiveValues(archived, actorId))
        .where(eq(ticketAttachments.id, attachmentId)),
      archived ? 'excluir o anexo' : 'devolver o anexo',
    );
  }
}
