import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNotNull, isNull } from 'drizzle-orm';

import { archiveValues } from '../../../lib/db/archive.util';
import { runMaybe, runQuery } from '../../../lib/db/db-error.util';
import { DB } from '../../../lib/db/db.token';
import { type Database } from '../../../lib/db/db.type';
import {
  type WhatsappTemplateRow,
  whatsappTemplates,
} from '../../../lib/db/schema/whatsapp-connections.schema';

@Injectable()
export class WhatsappTemplatesRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  /** Só os textos EDITADOS valendo — os originais moram no código. */
  async list(): Promise<WhatsappTemplateRow[]> {
    return runQuery(
      this.db.select().from(whatsappTemplates).where(isNull(whatsappTemplates.archivedAt)),
      'listar textos do WhatsApp',
    );
  }

  /** As edições desfeitas (de volta ao original) — o bloco "Removidos". */
  async listArchived(): Promise<WhatsappTemplateRow[]> {
    return runQuery(
      this.db.select().from(whatsappTemplates).where(isNotNull(whatsappTemplates.archivedAt)),
      'listar textos do WhatsApp desfeitos',
    );
  }

  async find(key: string): Promise<WhatsappTemplateRow | null> {
    return runMaybe(
      this.db
        .select()
        .from(whatsappTemplates)
        .where(and(eq(whatsappTemplates.key, key), isNull(whatsappTemplates.archivedAt)))
        .limit(1),
      'ler texto do WhatsApp',
    );
  }

  /** A edição arquivada daquele texto, se houver. */
  async findArchived(key: string): Promise<WhatsappTemplateRow | null> {
    return runMaybe(
      this.db
        .select()
        .from(whatsappTemplates)
        .where(and(eq(whatsappTemplates.key, key), isNotNull(whatsappTemplates.archivedAt)))
        .limit(1),
      'ler texto do WhatsApp desfeito',
    );
  }

  async save(key: string, body: string, updatedBy: string): Promise<void> {
    /* Editar de novo um texto que voltou ao original reaproveita a linha arquivada. */
    const values = { key, body, updatedBy, updatedAt: new Date(), ...archiveValues(false, null) };

    await runQuery(
      this.db
        .insert(whatsappTemplates)
        .values(values)
        .onConflictDoUpdate({ target: whatsappTemplates.key, set: values }),
      'gravar texto do WhatsApp',
    );
  }

  /** Arquivar a edição É restaurar: sem linha valendo, volta o texto original. Desarquivar é
   *  o "Desfazer", que traz a edição de volta. */
  async setArchived(key: string, archived: boolean, actorId: string | null): Promise<void> {
    await runQuery(
      this.db
        .update(whatsappTemplates)
        .set(archiveValues(archived, actorId))
        .where(eq(whatsappTemplates.key, key)),
      archived ? 'restaurar texto do WhatsApp' : 'desfazer a restauração do texto do WhatsApp',
    );
  }
}
