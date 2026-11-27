import { index, jsonb, serial, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

import { softwareSchema } from './schemas.schema';

/**
 * CADA AVISO DO GITHUB, como chegou — o diário do webhook do GitHub App.
 *
 * Guardar antes de processar é o que deixa o resto confiável:
 * - o GitHub reenvia o mesmo aviso quando não recebe resposta a tempo; o `delivery_id` (o
 *   `X-GitHub-Delivery`) é único, então o reenvio é reconhecido e não vira histórico dobrado;
 * - um aviso que falhou ao processar fica com o `error` escrito, e pode ser lido de novo depois;
 * - as próximas telas (git graph, branch ao vivo, produtividade) leem DAQUI, sem perguntar nada
 *   ao GitHub.
 */
export const githubWebhookEvents = softwareSchema.table(
  'github_webhook_events',
  {
    id: serial('id').primaryKey(),
    deliveryId: text('delivery_id').notNull(),
    /** O `X-GitHub-Event`: `issues`, `pull_request`, `push`, `create`, `delete`, `ping`… */
    event: text('event').notNull(),
    action: text('action'),
    /** `dono/repositorio`, como o GitHub escreve — nulo nos avisos da instalação. */
    repositoryFullName: text('repository_full_name'),
    senderLogin: text('sender_login'),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    receivedAt: timestamp('received_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    processedAt: timestamp('processed_at', { withTimezone: true, mode: 'date' }),
    error: text('error'),
  },
  (table) => [
    uniqueIndex('github_webhook_events_delivery_unique').on(table.deliveryId),
    index('github_webhook_events_repository_idx').on(table.repositoryFullName, table.receivedAt),
    index('github_webhook_events_event_idx').on(table.event, table.receivedAt),
  ],
);

export type GithubWebhookEventRow = typeof githubWebhookEvents.$inferSelect;
export type GithubWebhookEventInsert = typeof githubWebhookEvents.$inferInsert;
