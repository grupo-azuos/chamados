import { Inject, Injectable } from '@nestjs/common';
import { and, eq, ilike, or, sql } from 'drizzle-orm';

import { runMaybe, runQuery } from '../../../lib/db/db-error.util';
import { DB } from '../../../lib/db/db.token';
import { type Database } from '../../../lib/db/db.type';
import {
  githubWebhookEvents,
  type GithubWebhookEventInsert,
  type GithubWebhookEventRow,
} from '../../../lib/db/schema/github-webhook-events.schema';
import { softwareProjects } from '../../../lib/db/schema/software-projects.schema';
import { tickets } from '../../../lib/db/schema/tickets.schema';

@Injectable()
export class GithubWebhooksRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  /**
   * Guarda o aviso. Devolve `null` quando o `delivery_id` já existe: é o GitHub reenviando o
   * mesmo aviso, e ele não pode virar histórico dobrado.
   */
  async save(event: GithubWebhookEventInsert): Promise<GithubWebhookEventRow | null> {
    return runMaybe(
      this.db.insert(githubWebhookEvents).values(event).onConflictDoNothing().returning(),
      'guardar aviso do GitHub',
    );
  }

  async markProcessed(id: number, error: string | null, now = new Date()): Promise<void> {
    await runQuery(
      this.db
        .update(githubWebhookEvents)
        .set({ processedAt: now, error })
        .where(eq(githubWebhookEvents.id, id)),
      'marcar aviso do GitHub como processado',
    );
  }

  /**
   * O sistema (projeto) do repositório. Pelas colunas separadas, ou — no cadastro antigo, que só
   * tem o endereço — pelo fim do `repository_url`. Maiúscula não importa: o GitHub também não.
   */
  async findProjectIdByRepository(fullName: string): Promise<number | null> {
    const [owner, repo] = fullName.split('/');
    if (!owner || !repo) return null;

    const row = await runMaybe(
      this.db
        .select({ id: softwareProjects.id })
        .from(softwareProjects)
        .where(
          or(
            and(
              sql`lower(${softwareProjects.githubRepoOwner}) = lower(${owner})`,
              sql`lower(${softwareProjects.githubRepoName}) = lower(${repo})`,
            ),
            ilike(softwareProjects.repositoryUrl, `%github.com/${fullName}`),
            ilike(softwareProjects.repositoryUrl, `%github.com/${fullName}.git`),
            ilike(softwareProjects.repositoryUrl, `%github.com/${fullName}/`),
          ),
        )
        .limit(1),
      'achar o sistema do repositório',
    );

    return row?.id ?? null;
  }

  /** O chamado da issue — a issue é 1:1 com o chamado dentro do mesmo sistema. */
  async findTicketIdByIssue(projectId: number, issueNumber: number): Promise<number | null> {
    const row = await runMaybe(
      this.db
        .select({ id: tickets.id })
        .from(tickets)
        .where(and(eq(tickets.projectId, projectId), eq(tickets.githubIssueNumber, issueNumber)))
        .limit(1),
      'achar o chamado da issue',
    );

    return row?.id ?? null;
  }
}
