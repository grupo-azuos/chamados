import { index, integer, jsonb, serial, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

import { softwareSchema } from './schemas.schema';
import { softwareProjects } from './software-projects.schema';

/**
 * O GIT DE CADA SISTEMA — o que o git graph do mapa desenha: os commits (com os pais, que dão as
 * linhas do grafo) e as branches. A sincronização lê a develop e a main no GitHub; o webhook avisa
 * a branch nova (que pulsa no mapa), o push e a branch apagada.
 */
export const softwareCommits = softwareSchema.table(
  'software_commits',
  {
    id: serial('id').primaryKey(),
    projectId: integer('project_id')
      .notNull()
      .references(() => softwareProjects.id, { onDelete: 'cascade' }),
    sha: text('sha').notNull(),
    /** Os pais, na ordem do git: o primeiro é a linha de onde veio; os outros, o que juntou. */
    parents: jsonb('parents').$type<string[]>().notNull().default([]),
    /** A primeira linha da mensagem. */
    message: text('message').notNull(),
    authorLogin: text('author_login'),
    authorName: text('author_name').notNull(),
    committedAt: timestamp('committed_at', { withTimezone: true, mode: 'date' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('software_commits_sha_unique').on(table.projectId, table.sha),
    index('software_commits_date_idx').on(table.projectId, table.committedAt),
  ],
);

export type SoftwareCommitRow = typeof softwareCommits.$inferSelect;
export type SoftwareCommitInsert = typeof softwareCommits.$inferInsert;

export const softwareBranches = softwareSchema.table(
  'software_branches',
  {
    id: serial('id').primaryKey(),
    projectId: integer('project_id')
      .notNull()
      .references(() => softwareProjects.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    /** O commit da ponta, quando se sabe. */
    headSha: text('head_sha'),
    /** Quando o sistema viu a branch pela primeira vez — a nova pulsa no mapa. */
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    lastPushAt: timestamp('last_push_at', { withTimezone: true, mode: 'date' }),
    /** Apagada no GitHub (normalmente depois do merge). */
    deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
  },
  (table) => [uniqueIndex('software_branches_name_unique').on(table.projectId, table.name)],
);

export type SoftwareBranchRow = typeof softwareBranches.$inferSelect;

/** As TAGS (versões) de cada sistema: a etiqueta e o commit dela. A versão fecha o que entrou antes. */
export const softwareTags = softwareSchema.table(
  'software_tags',
  {
    id: serial('id').primaryKey(),
    projectId: integer('project_id')
      .notNull()
      .references(() => softwareProjects.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    sha: text('sha').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('software_tags_name_unique').on(table.projectId, table.name)],
);

export type SoftwareTagRow = typeof softwareTags.$inferSelect;
