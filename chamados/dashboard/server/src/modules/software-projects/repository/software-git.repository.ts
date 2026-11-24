import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, inArray, notInArray, sql } from 'drizzle-orm';

import { runQuery } from '../../../lib/db/db-error.util';
import { DB } from '../../../lib/db/db.token';
import { type Database } from '../../../lib/db/db.type';
import {
  type SoftwareBranchRow,
  softwareBranches,
  type SoftwareCommitInsert,
  type SoftwareCommitRow,
  softwareCommits,
} from '../../../lib/db/schema/software-git.schema';

/** Quantos commits de cada sistema o git graph desenha: os mais recentes. */
export const GRAPH_COMMIT_LIMIT = 200;

/** O git de cada sistema: commits (com os pais) e branches, para o git graph do mapa. */
@Injectable()
export class SoftwareGitRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  /** Grava os commits lidos; o que já existe (mesmo hash) fica como está. */
  async upsertCommits(commits: readonly SoftwareCommitInsert[]): Promise<void> {
    if (!commits.length) return;
    await runQuery(
      this.db
        .insert(softwareCommits)
        .values([...commits])
        .onConflictDoNothing(),
      'gravar commits do sistema',
    );
  }

  /**
   * As branches que o GitHub listou agora: a nova entra (com a hora em que foi vista), a que já
   * existia atualiza a ponta, e a que sumiu do GitHub fica marcada como apagada.
   */
  async syncBranches(
    projectId: number,
    branches: readonly { name: string; headSha: string | null }[],
  ): Promise<void> {
    const names = branches.map((branch) => branch.name);
    await this.db.transaction(async (tx) => {
      if (branches.length) {
        await runQuery(
          tx
            .insert(softwareBranches)
            .values(
              branches.map((branch) => ({ projectId, name: branch.name, headSha: branch.headSha })),
            )
            .onConflictDoUpdate({
              target: [softwareBranches.projectId, softwareBranches.name],
              set: { headSha: sql`excluded.head_sha`, deletedAt: null },
            }),
          'gravar branches do sistema',
        );
      }
      await runQuery(
        tx
          .update(softwareBranches)
          .set({ deletedAt: new Date() })
          .where(
            and(
              eq(softwareBranches.projectId, projectId),
              sql`${softwareBranches.deletedAt} is null`,
              names.length ? notInArray(softwareBranches.name, names) : undefined,
            ),
          ),
        'marcar branches apagadas',
      );
    });
  }

  /** O aviso do webhook: branch criada ou com push novo (a ponta e a hora). */
  async touchBranch(
    projectId: number,
    name: string,
    headSha: string | null,
    at: Date,
  ): Promise<void> {
    await runQuery(
      this.db
        .insert(softwareBranches)
        .values({ projectId, name, headSha, firstSeenAt: at, lastPushAt: at })
        .onConflictDoUpdate({
          target: [softwareBranches.projectId, softwareBranches.name],
          set: {
            headSha: headSha ?? sql`${softwareBranches.headSha}`,
            lastPushAt: at,
            deletedAt: null,
          },
        }),
      'avisar push na branch',
    );
  }

  async deleteBranch(projectId: number, name: string): Promise<void> {
    await runQuery(
      this.db
        .update(softwareBranches)
        .set({ deletedAt: new Date() })
        .where(and(eq(softwareBranches.projectId, projectId), eq(softwareBranches.name, name))),
      'marcar branch apagada',
    );
  }

  /** Os commits mais recentes e as branches vivas de cada sistema. */
  async graphOf(
    projectIds: readonly number[],
  ): Promise<{ commits: SoftwareCommitRow[]; branches: SoftwareBranchRow[] }> {
    if (!projectIds.length) return { commits: [], branches: [] };
    const [commits, branches] = await Promise.all([
      runQuery(
        this.db
          .select()
          .from(softwareCommits)
          .where(
            sql`${softwareCommits.id} in (
              select id from (
                select id, row_number() over (partition by project_id order by committed_at desc, id desc) as n
                from ${softwareCommits}
                where project_id in (${sql.join(
                  projectIds.map((id) => sql`${id}`),
                  sql`, `,
                )})
              ) recent where n <= ${GRAPH_COMMIT_LIMIT}
            )`,
          )
          .orderBy(desc(softwareCommits.committedAt), desc(softwareCommits.id)),
        'ler os commits dos sistemas',
      ),
      runQuery(
        this.db
          .select()
          .from(softwareBranches)
          .where(
            and(
              inArray(softwareBranches.projectId, [...projectIds]),
              sql`${softwareBranches.deletedAt} is null`,
            ),
          ),
        'ler as branches dos sistemas',
      ),
    ]);

    return { commits, branches };
  }
}
