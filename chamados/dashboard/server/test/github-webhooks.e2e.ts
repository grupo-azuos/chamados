import { createHmac } from 'node:crypto';

import { type INestApplication } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { githubWebhookEvents } from '../src/lib/db/schema/github-webhook-events.schema';
import { softwareBranches, softwareTags } from '../src/lib/db/schema/software-git.schema';
import { softwareProjects } from '../src/lib/db/schema/software-projects.schema';
import { softwareTimelineEvents } from '../src/lib/db/schema/software-timeline-events.schema';
import { tickets } from '../src/lib/db/schema/tickets.schema';
import { asAna, createE2eApp, type E2eApp } from './support/e2e-app.util';

/**
 * O WEBHOOK DO GITHUB APP de ponta a ponta: a assinatura conferida sobre o corpo CRU (só a API
 * de verdade, com `rawBody`, prova isso), o aviso guardado uma vez só, a issue fechada encerrando
 * o chamado e o PR indo para a timeline.
 *
 * O segredo entra pelo ambiente ANTES de a API subir, como na produção.
 *
 * Sem `TEST_DATABASE_URL` a suíte é pulada, e não falha.
 */
const testDatabaseUrl = process.env.TEST_DATABASE_URL;

const SECRET = 'segredo-do-webhook-de-teste-e2e';

function signature(body: string, secret = SECRET): string {
  return `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
}

describe.skipIf(!testDatabaseUrl)('GitHub webhook (e2e)', () => {
  let started: E2eApp;
  let app: INestApplication;
  let projectId: number;
  let ticketId: number;

  const send = (event: string, payload: unknown, delivery: string, secret = SECRET) => {
    const body = JSON.stringify(payload);
    return request(app.getHttpServer())
      .post('/api/v1/github/webhook')
      .set('Content-Type', 'application/json')
      .set('X-GitHub-Event', event)
      .set('X-GitHub-Delivery', delivery)
      .set('X-Hub-Signature-256', signature(body, secret))
      .send(body);
  };

  const closedIssue = {
    action: 'closed',
    repository: { full_name: 'grupo-azuos/paralegal' },
    sender: { login: 'alguem-de-fora' },
    issue: {
      number: 85,
      title: 'Botão de voltar',
      html_url: 'https://github.com/grupo-azuos/paralegal/issues/85',
      state: 'closed',
      state_reason: 'completed',
      created_at: '2026-11-20T10:00:00Z',
      closed_at: '2026-11-23T15:00:00Z',
      user: { login: 'app-chamados[bot]' },
    },
  };

  beforeAll(async () => {
    process.env.GITHUB_APP_WEBHOOK_SECRET = SECRET;
    started = await createE2eApp(testDatabaseUrl!);
    app = started.app;
  });

  beforeEach(async () => {
    await started.truncate(
      'github_webhook_events',
      'software_branches',
      'software_tags',
      'software_commits',
      'software_timeline_events',
      'ticket_histories',
      'tickets',
      'software_projects',
    );
    const [project] = await started.db
      .insert(softwareProjects)
      .values({
        name: 'Paralegal',
        repositoryUrl: 'https://github.com/grupo-azuos/paralegal',
        createdBy: 'ti@empresa.com.br',
      })
      .returning();
    projectId = project!.id;

    const opened = await request(app.getHttpServer())
      .post('/api/v1/tickets')
      .set(asAna())
      .send({
        requesterName: 'Marta da Recepção',
        area: 'infra',
        department: 'RECEPÇÃO',
        problemType: 'printer',
        contactPhone: '62 99999-1234',
        description: 'O botão de voltar some na tela de alvarás.',
      })
      .expect(201);
    ticketId = opened.body.id as number;
    await started.db
      .update(tickets)
      .set({ projectId, githubIssueNumber: 85 })
      .where(eq(tickets.id, ticketId));
  });

  afterAll(async () => {
    await app.close();
    delete process.env.GITHUB_APP_WEBHOOK_SECRET;
  });

  // feliz
  it('marks the new branch (it pulses on the map), its push and its deletion', async () => {
    const repository = { full_name: 'grupo-azuos/paralegal' };
    await send(
      'create',
      { ref_type: 'branch', ref: 'feature/mapa', repository },
      'delivery-b1',
    ).expect(202);
    await send(
      'push',
      { ref: 'refs/heads/feature/mapa', after: 'c0ffee', repository },
      'delivery-b2',
    ).expect(202);

    const [branch] = await started.db.select().from(softwareBranches);
    expect(branch).toMatchObject({
      projectId,
      name: 'feature/mapa',
      headSha: 'c0ffee',
      deletedAt: null,
    });
    expect(branch?.lastPushAt).toBeInstanceOf(Date);

    await send(
      'delete',
      { ref_type: 'branch', ref: 'feature/mapa', repository },
      'delivery-b3',
    ).expect(202);
    const [deleted] = await started.db.select().from(softwareBranches);
    expect(deleted?.deletedAt).toBeInstanceOf(Date);
  });

  // feliz
  it('puts a version pushed as a tag on the graph, and takes it out when the tag is deleted', async () => {
    const repository = { full_name: 'grupo-azuos/paralegal' };
    await send(
      'push',
      { ref: 'refs/tags/v1.4.0', after: 'c0ffee', repository },
      'delivery-t1',
    ).expect(202);
    expect(await started.db.select().from(softwareTags)).toEqual([
      expect.objectContaining({ projectId, name: 'v1.4.0', sha: 'c0ffee' }),
    ]);

    await send('delete', { ref_type: 'tag', ref: 'v1.4.0', repository }, 'delivery-t2').expect(202);
    expect(await started.db.select().from(softwareTags)).toEqual([]);
  });

  // feliz
  it('closes the ticket of the issue and writes the issue to the timeline', async () => {
    const response = await send('issues', closedIssue, 'delivery-1').expect(202);

    expect(response.body).toEqual({ status: 'accepted' });
    const [ticket] = await started.db.select().from(tickets).where(eq(tickets.id, ticketId));
    expect(ticket).toMatchObject({ status: 'resolved', assigneeId: null });
    expect(ticket?.solution).toContain('Issue #85 fechada no GitHub por @alguem-de-fora');

    const timeline = await started.db.select().from(softwareTimelineEvents);
    expect(timeline).toEqual([
      expect.objectContaining({ projectId, type: 'issue', externalId: '#85', status: 'closed' }),
    ]);

    const [stored] = await started.db.select().from(githubWebhookEvents);
    expect(stored).toMatchObject({ deliveryId: 'delivery-1', event: 'issues', error: null });
    expect(stored?.processedAt).toBeInstanceOf(Date);
  });

  // feliz
  it('reopens the ticket when the issue is reopened', async () => {
    await send('issues', closedIssue, 'delivery-1').expect(202);
    const reopened = {
      ...closedIssue,
      action: 'reopened',
      issue: { ...closedIssue.issue, state: 'open' },
    };

    await send('issues', reopened, 'delivery-2').expect(202);

    const [ticket] = await started.db.select().from(tickets).where(eq(tickets.id, ticketId));
    expect(ticket?.status).toBe('in_progress');
  });

  // triste
  it('ignores the same notice sent twice', async () => {
    await send('issues', closedIssue, 'delivery-1').expect(202);

    const again = await send('issues', closedIssue, 'delivery-1').expect(202);

    expect(again.body).toEqual({ status: 'duplicate' });
    expect(await started.db.select().from(githubWebhookEvents)).toHaveLength(1);
  });

  // triste
  it('refuses a notice signed with another secret and stores nothing', async () => {
    await send('issues', closedIssue, 'delivery-1', 'segredo-de-um-impostor').expect(401);

    expect(await started.db.select().from(githubWebhookEvents)).toHaveLength(0);
    const [ticket] = await started.db.select().from(tickets).where(eq(tickets.id, ticketId));
    expect(ticket?.status).toBe('open');
  });
});
