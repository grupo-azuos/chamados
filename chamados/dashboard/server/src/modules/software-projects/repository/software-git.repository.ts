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
  type SoftwareTagRow,
  softwareTags,
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

  /** As tags que o GitHub listou agora: a nova entra, a que mudou de commit troca, a que sumiu sai. */
  async syncTags(projectId: number, tags: readonly { name: string; sha: string }[]): Promise<void> {
    await this.db.transaction(async (tx) => {
      await runQuery(
        tx.delete(softwareTags).where(
          and(
            eq(softwareTags.projectId, projectId),
            tags.length
              ? notInArray(
                  softwareTags.name,
                  tags.map((tag) => tag.name),
                )
              : undefined,
          ),
        ),
        'tirar tags apagadas',
      );
      if (!tags.length) return;
      await runQuery(
        tx
          .insert(softwareTags)
          .values(tags.map((tag) => ({ projectId, name: tag.name, sha: tag.sha })))
          .onConflictDoUpdate({
            target: [softwareTags.projectId, softwareTags.name],
            set: { sha: sql`excluded.sha` },
          }),
        'gravar tags do sistema',
      );
    });
  }

  /** O aviso do webhook: tag nova (o push de `refs/tags/...`) ou apagada. */
  async touchTag(projectId: number, name: string, sha: string): Promise<void> {
    await runQuery(
      this.db
        .insert(softwareTags)
        .values({ projectId, name, sha })
        .onConflictDoUpdate({ target: [softwareTags.projectId, softwareTags.name], set: { sha } }),
      'avisar tag nova',
    );
  }

  async deleteTag(projectId: number, name: string): Promise<void> {
    await runQuery(
      this.db
        .delete(softwareTags)
        .where(and(eq(softwareTags.projectId, projectId), eq(softwareTags.name, name))),
      'tirar tag apagada',
    );
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
  ): Promise<{
    commits: SoftwareCommitRow[];
    branches: SoftwareBranchRow[];
    tags: SoftwareTagRow[];
  }> {
    if (!projectIds.length) return { commits: [], branches: [], tags: [] };
    const [commits, branches, tags] = await Promise.all([
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
      runQuery(
        this.db
          .select()
          .from(softwareTags)
          .where(inArray(softwareTags.projectId, [...projectIds])),
        'ler as tags dos sistemas',
      ),
    ]);

    return { commits, branches, tags };
  }
}
