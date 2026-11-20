import { type Archive, type ArchivedFilter } from '@template/shared/schemas/archive.schema';
import { isNotNull, isNull, type SQL } from 'drizzle-orm';
import { text, timestamp, type AnyPgColumn } from 'drizzle-orm/pg-core';

/**
 * As duas colunas do arquivamento, iguais em toda tabela que não se apaga. Timestamp em vez de
 * booleano: responde de graça QUANDO. `archived_by` é texto, como o `created_by_id` das outras
 * tabelas: o id vem do admin-console e as linhas antigas guardam o id do login anterior.
 */
export function archiveColumns() {
  return {
    archivedAt: timestamp('archived_at', { withTimezone: true, mode: 'date' }),
    archivedBy: text('archived_by'),
  };
}

/** O filtro da lista: `hide` esconde, `only` traz só os arquivados, `show` não filtra. */
export function archivedCondition(column: AnyPgColumn, filter: ArchivedFilter): SQL | undefined {
  if (filter === 'show') return undefined;

  return filter === 'only' ? isNotNull(column) : isNull(column);
}

/** Os valores de arquivar (com quem) e de desarquivar (tudo nulo). */
export function archiveValues(
  archived: boolean,
  actorId: string | null,
): { archivedAt: Date | null; archivedBy: string | null } {
  if (!archived) return { archivedAt: null, archivedBy: null };

  return { archivedAt: new Date(), archivedBy: actorId };
}

/** A linha vira o bloco do contrato — nulo enquanto está em uso. */
export function toArchive(row: { archivedAt: Date | null; archivedBy: string | null }): Archive {
  if (!row.archivedAt) return null;

  return { archivedAt: row.archivedAt.toISOString(), archivedBy: row.archivedBy };
}
