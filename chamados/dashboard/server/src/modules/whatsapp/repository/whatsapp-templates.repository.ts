import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

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

  /** Só os textos EDITADOS — os originais moram no código. */
  async list(): Promise<WhatsappTemplateRow[]> {
    return runQuery(this.db.select().from(whatsappTemplates), 'listar textos do WhatsApp');
  }

  async find(key: string): Promise<WhatsappTemplateRow | null> {
    return runMaybe(
      this.db.select().from(whatsappTemplates).where(eq(whatsappTemplates.key, key)).limit(1),
      'ler texto do WhatsApp',
    );
  }

  async save(key: string, body: string, updatedBy: string): Promise<void> {
    const values = { key, body, updatedBy, updatedAt: new Date() };

    await runQuery(
      this.db
        .insert(whatsappTemplates)
        .values(values)
        .onConflictDoUpdate({ target: whatsappTemplates.key, set: values }),
      'gravar texto do WhatsApp',
    );
  }

  /** Apagar a linha É restaurar: sem ela, volta a valer o texto original. */
  async remove(key: string): Promise<void> {
    await runQuery(
      this.db.delete(whatsappTemplates).where(eq(whatsappTemplates.key, key)),
      'restaurar texto do WhatsApp',
    );
  }
}
