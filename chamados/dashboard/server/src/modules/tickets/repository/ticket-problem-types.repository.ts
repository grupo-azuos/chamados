import { Inject, Injectable } from '@nestjs/common';
import { type TicketArea } from '@template/shared/domain/ticket-catalog.util';
import { and, asc, eq, sql } from 'drizzle-orm';

import { DB } from '../../../lib/db/db.token';
import { type Database } from '../../../lib/db/db.type';
import { runMaybe, runQuery } from '../../../lib/db/db-error.util';
import {
  type TicketProblemTypeRow,
  ticketProblemTypes,
} from '../../../lib/db/schema/ticket-problem-types.schema';

/**
 * Os tipos de problema CADASTRADOS na hora (ver `ticket-problem-types.schema`). Só lê e grava:
 * o que vale como tipo de uma área é regra do service.
 */
@Injectable()
export class TicketProblemTypesRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  async listByArea(area: TicketArea): Promise<TicketProblemTypeRow[]> {
    return runQuery(
      this.db
        .select()
        .from(ticketProblemTypes)
        .where(eq(ticketProblemTypes.area, area))
        .orderBy(asc(ticketProblemTypes.name)),
      'listar os tipos de problema cadastrados',
    );
  }

  /** O tipo da área com este nome, sem diferença entre maiúscula e minúscula. */
  async findByName(area: TicketArea, name: string): Promise<TicketProblemTypeRow | null> {
    return runMaybe(
      this.db
        .select()
        .from(ticketProblemTypes)
        .where(
          and(
            eq(ticketProblemTypes.area, area),
            sql`lower(${ticketProblemTypes.name}) = lower(${name})`,
          ),
        )
        .limit(1),
      'buscar o tipo de problema cadastrado',
    );
  }

  /**
   * Cadastra o tipo. Dois cadastros do mesmo nome ao mesmo tempo não viram dois: o segundo
   * esbarra no índice único e não faz nada — quem chama relê o que ficou.
   */
  async insert(area: TicketArea, name: string, createdBy: string): Promise<void> {
    await runQuery(
      this.db.insert(ticketProblemTypes).values({ area, name, createdBy }).onConflictDoNothing(),
      'cadastrar o tipo de problema',
    );
  }
}
