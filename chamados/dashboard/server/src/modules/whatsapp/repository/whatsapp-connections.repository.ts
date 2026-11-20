import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';

import { archiveValues } from '../../../lib/db/archive.util';
import { runMaybe, runQuery } from '../../../lib/db/db-error.util';
import { DB } from '../../../lib/db/db.token';
import { type Database } from '../../../lib/db/db.type';
import {
  type WhatsappConnectionRow,
  whatsappConnections,
} from '../../../lib/db/schema/whatsapp-connections.schema';

@Injectable()
export class WhatsappConnectionsRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  async find(userId: string): Promise<WhatsappConnectionRow | null> {
    return runMaybe(
      this.db
        .select()
        .from(whatsappConnections)
        .where(and(eq(whatsappConnections.userId, userId), isNull(whatsappConnections.archivedAt)))
        .limit(1),
      'ler vínculo de WhatsApp',
    );
  }

  /** Todos os vínculos valendo — são poucos: um por pessoa que administra. */
  async list(): Promise<WhatsappConnectionRow[]> {
    return runQuery(
      this.db.select().from(whatsappConnections).where(isNull(whatsappConnections.archivedAt)),
      'listar vínculos de WhatsApp',
    );
  }

  /** Grava o número vinculado. Trocar de número (ou vincular de novo depois de desvincular)
   *  mantém a linha e renova a data do vínculo. */
  async save(userId: string, phone: string, operatorName: string | null = null): Promise<void> {
    const now = new Date();

    await runQuery(
      this.db
        .insert(whatsappConnections)
        .values({ userId, phone, operatorName, linkedAt: now, updatedAt: now })
        .onConflictDoUpdate({
          target: whatsappConnections.userId,
          set: { phone, operatorName, linkedAt: now, updatedAt: now, ...archiveValues(false, null) },
        }),
      'gravar vínculo de WhatsApp',
    );
  }

  /** Desvincula: arquiva a linha, com quem desvinculou e quando. */
  async archive(userId: string, actorId: string | null): Promise<void> {
    await runQuery(
      this.db
        .update(whatsappConnections)
        .set(archiveValues(true, actorId))
        .where(eq(whatsappConnections.userId, userId)),
      'remover vínculo de WhatsApp',
    );
  }
}
