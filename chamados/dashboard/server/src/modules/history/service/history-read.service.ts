import { Inject, Injectable, Optional } from '@nestjs/common';
import { type DirectoryUser } from '@template/shared/schemas/user.schema';
import {
  historyKindOf,
  type HistoryChange,
  type HistoryEntry,
  type HistoryPage,
  type HistoryQuery,
} from '@template/shared/schemas/history.schema';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { USER_DIRECTORY_PROVIDER } from '../../../lib/auth/user-directory.token';
import { type UserDirectoryProvider } from '../../../lib/auth/user-directory.type';
import { type HistoryRow } from '../../../lib/db/schema/history.schema';
import { getRoleInContext } from '../../../lib/policy/access.policy';
import { assertCanRead } from '../../../lib/policy/policy-assert.util';
import { HistoryRepository } from '../repository/history.repository';

/**
 * A LEITURA DO HISTÓRICO — a tela Histórico de cada módulo. Toda a equipe do módulo lê: é a
 * resposta de "quem mudou isso?". Quem fez sai pelo nome de hoje no diretório de pessoas; fora
 * dele, o e-mail gravado na hora.
 *
 * Separada do `HistoryService` de propósito: aquele grava, e o interceptor o usa em toda
 * requisição; esta lê, e só a tela precisa dela.
 */
@Injectable()
export class HistoryReadService {
  constructor(
    private readonly repository: HistoryRepository,
    @Optional()
    @Inject(USER_DIRECTORY_PROVIDER)
    private readonly directory?: UserDirectoryProvider,
  ) {}

  async list(user: RequestUser, query: HistoryQuery): Promise<HistoryPage> {
    assertCanRead(getRoleInContext(user, query.module), 'o histórico deste módulo');
    const actorId = query.actor === 'me' ? user.id : null;
    const [page, people] = await Promise.all([this.repository.list(query, actorId), this.people()]);

    return {
      items: page.rows.map((row) => toHistoryEntry(row, people)),
      total: page.total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  /* Sem o diretório (ou com ele fora do ar) a lista sai do mesmo jeito, com o e-mail no lugar. */
  private async people(): Promise<Map<string, DirectoryUser>> {
    if (!this.directory) return new Map();
    try {
      return new Map((await this.directory.listUsers()).map((person) => [person.id, person]));
    } catch {
      return new Map();
    }
  }
}

export function toHistoryEntry(row: HistoryRow, people: Map<string, DirectoryUser>): HistoryEntry {
  const name = (row.actorId && people.get(row.actorId)?.name) || row.actorEmail;

  return {
    id: String(row.id),
    action: row.action,
    kind: historyKindOf(row.action),
    target: { type: row.targetType, id: row.targetId, label: row.targetLabel },
    changes: row.changes.map(toChange),
    actor: { id: row.actorId, name: name ?? null },
    occurredAt: row.occurredAt.toISOString(),
  };
}

/** O valor gravado em texto: a lista vira "a, b", e o que não é texto nem número, JSON. */
export function historyValueText(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (Array.isArray(value)) return value.length ? value.map((item) => historyValueText(item)).join(', ') : null;
  if (typeof value === 'object') return JSON.stringify(value);

  return String(value);
}

function toChange(change: { field: string; from: unknown; to: unknown }): HistoryChange {
  return { field: change.field, from: historyValueText(change.from), to: historyValueText(change.to) };
}
