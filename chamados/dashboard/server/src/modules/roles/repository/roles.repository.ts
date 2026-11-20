import { Inject, Injectable } from '@nestjs/common';
import { type ArchivedFilter } from '@template/shared/schemas/archive.schema';
import { and, asc, desc, eq, isNull, or, sql } from 'drizzle-orm';

import { archivedCondition, archiveValues } from '../../../lib/db/archive.util';
import { runMaybe, runQuery } from '../../../lib/db/db-error.util';
import { DB } from '../../../lib/db/db.token';
import { type Database } from '../../../lib/db/db.type';
import {
  internalRoles,
  type InternalRoleInsert,
  type InternalRoleRow,
} from '../../../lib/db/schema/internal-roles.schema';
import { superAdmins } from '../../../lib/db/schema/super-admins.schema';

/**
 * Acesso ao banco de dados para a tabela `internal_roles`.
 * O repository não tem regra de negócio: toda política de acesso mora no service.
 */
@Injectable()
export class RolesRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  /** Os acessos valendo; `only` traz os tirados (arquivados) — o bloco "Removidos". */
  async list(archived: ArchivedFilter = 'hide'): Promise<InternalRoleRow[]> {
    return runQuery(
      this.db
        .select()
        .from(internalRoles)
        .where(archivedCondition(internalRoles.archivedAt, archived))
        .orderBy(desc(internalRoles.createdAt), desc(internalRoles.id)),
      'listar cargos internos',
    );
  }

  /** Os super-admins — só leitura: quem os cria é o comando `superadmin:promote`. */
  async listSuperAdmins(): Promise<{ userId: string | null; userEmail: string }[]> {
    return runQuery(
      this.db
        .select({ userId: superAdmins.userId, userEmail: superAdmins.userEmail })
        .from(superAdmins),
      'listar super-admins',
    );
  }

  async findById(id: number): Promise<InternalRoleRow | null> {
    return runMaybe(
      this.db.select().from(internalRoles).where(eq(internalRoles.id, id)).limit(1),
      'ler cargo interno',
    );
  }

  async findByUserIdOrEmail(identifier: string): Promise<InternalRoleRow[]> {
    return runQuery(
      this.db
        .select()
        .from(internalRoles)
        .where(
          and(
            or(eq(internalRoles.userId, identifier), eq(internalRoles.userEmail, identifier)),
            isNull(internalRoles.archivedAt),
          ),
        )
        .orderBy(asc(internalRoles.context)),
      'listar cargos da pessoa',
    );
  }

  async upsert(values: InternalRoleInsert): Promise<InternalRoleRow> {
    const [row] = await runQuery(
      this.db
        .insert(internalRoles)
        .values(values)
        .onConflictDoUpdate({
          /* O índice único é só dos acessos valendo: o tirado não conflita, e liberar de novo
             cria a linha nova. */
          target: [internalRoles.userId, internalRoles.context],
          targetWhere: isNull(internalRoles.archivedAt),
          set: {
            userEmail: values.userEmail,
            updatedAt: new Date(),
            updatedBy: values.updatedBy,
          },
        })
        .returning(),
      'salvar cargo interno',
    );

    return row as InternalRoleRow;
  }

  /** Um INSERT só: todos os módulos entram ou a operação inteira é desfeita pelo banco. */
  async upsertMany(values: InternalRoleInsert[]): Promise<InternalRoleRow[]> {
    return runQuery(
      this.db
        .insert(internalRoles)
        .values(values)
        .onConflictDoUpdate({
          target: [internalRoles.userId, internalRoles.context],
          targetWhere: isNull(internalRoles.archivedAt),
          set: {
            userEmail: sql`excluded.user_email`,
            updatedAt: new Date(),
            updatedBy: sql`excluded.updated_by`,
          },
        })
        .returning(),
      'salvar módulos da pessoa',
    );
  }

  /** Tira o módulo (arquiva) ou devolve (desarquiva). A linha nunca sai do banco. */
  async setArchived(id: number, archived: boolean, actorId: string | null): Promise<void> {
    await runQuery(
      this.db
        .update(internalRoles)
        .set(archiveValues(archived, actorId))
        .where(eq(internalRoles.id, id)),
      archived ? 'tirar módulo' : 'devolver módulo',
    );
  }

  /** O acesso valendo da pessoa naquele módulo, se houver. */
  async findActive(userId: string, context: string): Promise<InternalRoleRow | null> {
    return runMaybe(
      this.db
        .select()
        .from(internalRoles)
        .where(
          and(
            eq(internalRoles.userId, userId),
            eq(internalRoles.context, context),
            isNull(internalRoles.archivedAt),
          ),
        )
        .limit(1),
      'ler acesso valendo',
    );
  }
}
