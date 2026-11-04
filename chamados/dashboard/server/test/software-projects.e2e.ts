import { generateKeyPairSync } from 'node:crypto';

import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { githubConnections } from '../src/lib/db/schema/github-connections.schema';
import { tickets } from '../src/lib/db/schema/tickets.schema';
import { encryptGithubToken } from '../src/modules/github-integration/service/github-token-cipher.util';
import {
  asAna,
  asDora,
  asEdu,
  asOlga,
  createE2eApp,
  DORA,
  type E2eApp,
  OLGA,
} from './support/e2e-app.util';

/**
 * O MÓDULO SISTEMA de ponta a ponta: os sistemas cadastrados, o cronograma, a linha do tempo e
 * o painel — e a sincronização com o GitHub, que aqui fala com um GitHub FINGIDO.
 *
 * O `fetch` é substituído na suíte inteira: nenhum teste sai para a rede. O GitHub de mentira
 * confirma a conta vinculada, devolve um PR aberto, nenhuma issue e nenhum merge — o bastante
 * para a linha do tempo ganhar uma linha e a contagem de PRs do sistema sair do zero.
 *
 * O OAuth do GitHub entra pelo ambiente ANTES de a API subir: sem ele, a tranca do módulo
 * Sistema (`GithubLinkedGuard`) fecha a porta para todo administrador, e é com ele que o
 * vínculo gravado no banco (com o token cifrado) passa a valer.
 *
 * Sem `TEST_DATABASE_URL` a suíte é pulada, e não falha.
 */
const testDatabaseUrl = process.env.TEST_DATABASE_URL;

const ONE_PR = [
  {
    number: 7,
    title: 'Corrige a tela de chamados',
    html_url: 'https://github.com/org/chamados/pull/7',
    user: { login: 'dev-um' },
    state: 'open',
    created_at: '2026-10-01T12:00:00Z',
  },
];

const ENCRYPTION_KEY = 'ab'.repeat(32);

/** Cada pessoa vinculada tem o próprio token e a própria conta lá — é o token que diz quem é. */
const ACCOUNTS: Record<string, { id: number; login: string }> = {
  'token-da-dora': { id: 1001, login: 'dora-gh' },
  'token-da-olga': { id: 1002, login: 'olga-gh' },
};

function fakeGithub(url: string, init?: RequestInit): Response {
  /* O token da instalação do App da organização: é com ele que os PRs são lidos. */
  if (url.includes('/app/installations/')) {
    const expiresAt = new Date(Date.now() + 3_600_000).toISOString();

    return new Response(JSON.stringify({ token: 'token-da-app', expires_at: expiresAt }));
  }
  if (url.endsWith('/user')) {
    const bearer = String((init?.headers as Record<string, string> | undefined)?.Authorization);
    const account = ACCOUNTS[bearer.replace('Bearer ', '')];

    return account ? new Response(JSON.stringify(account)) : new Response('{}', { status: 401 });
  }
  if (url.includes('/pulls?')) return new Response(JSON.stringify(ONE_PR));
  if (url.includes('/users/')) return new Response(JSON.stringify({ name: 'Dev Um' }));

  return new Response('[]');
}

describe.skipIf(!testDatabaseUrl)('Software projects API (e2e)', () => {
  let started: E2eApp;
  let app: INestApplication;

  const api = () => request(app.getHttpServer());

  const registerProject = (body: Record<string, unknown>, who = asDora()) =>
    api()
      .post('/api/v1/software-projects')
      .set(who)
      .send({ name: 'Chamados', repositoryUrl: 'https://github.com/org/chamados', ...body });

  const linkGithub = (userId: string, token: string) =>
    started.db.insert(githubConnections).values({
      userId,
      githubId: String(ACCOUNTS[token]!.id),
      login: ACCOUNTS[token]!.login,
      accessToken: encryptGithubToken(token, ENCRYPTION_KEY),
    });

  const unlinkGithub = (userId: string) =>
    started.db.delete(githubConnections).where(eq(githubConnections.userId, userId));

  const registerEvent = (body: Record<string, unknown>, who = asDora()) =>
    api()
      .post('/api/v1/software-schedule')
      .set(who)
      .send({
        title: 'Deploy do Chamados',
        category: 'deploy',
        date: '2026-10-20',
        startTime: '09:00',
        endTime: '10:00',
        ...body,
      });

  beforeAll(async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) =>
      fakeGithub(String(input), init),
    );
    process.env.GITHUB_OAUTH_CLIENT_ID = 'cliente-de-teste';
    process.env.GITHUB_OAUTH_CLIENT_SECRET = 'segredo-de-teste';
    process.env.GITHUB_OAUTH_REDIRECT_URI = 'http://localhost:3005/api/integrations/github/callback';
    process.env.GITHUB_OAUTH_FRONTEND_URL = 'http://localhost:5005';
    process.env.GITHUB_OAUTH_ENCRYPTION_KEY = ENCRYPTION_KEY;
    /* O App da organização assina um JWT com a chave privada; a chave é gerada aqui e nunca
       sai do teste. */
    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    process.env.GITHUB_APP_ID = '12';
    process.env.GITHUB_APP_INSTALLATION_ID = '34';
    process.env.GITHUB_APP_PRIVATE_KEY = privateKey.export({ type: 'pkcs1', format: 'pem' }) as string;
    started = await createE2eApp(testDatabaseUrl!);
    app = started.app;
  });

  beforeEach(async () => {
    await started.truncate(
      'software_schedule_events',
      'software_timeline_events',
      'software_projects',
      'github_connections',
      'tickets',
    );
    await linkGithub(DORA.id, 'token-da-dora');
    await linkGithub(OLGA.id, 'token-da-olga');
  });

  afterAll(async () => {
    await app.close();
    vi.restoreAllMocks();
    for (const key of Object.keys(process.env).filter((name) => name.startsWith('GITHUB_'))) {
      delete process.env[key];
    }
  });

  describe('projects', () => {
    // feliz
    it('registers the system, reading owner and repository from the GitHub link', async () => {
      const created = await registerProject({ description: '  O sistema de chamados.  ' }).expect(
        201,
      );

      expect(created.body).toMatchObject({
        name: 'Chamados',
        description: 'O sistema de chamados.',
        status: 'active',
        color: 'blue',
        githubRepoOwner: 'org',
        githubRepoName: 'chamados',
        responsibleId: null,
        openTicketsCount: 0,
        pullRequestsCount: 0,
      });
    });

    it('lists with search and status, counting open tickets of each system', async () => {
      const chamados = await registerProject({}).expect(201);
      await registerProject({ name: 'Legado', repositoryUrl: 'org/legado', status: 'deprecated' })
        .expect(201);

      await started.db.insert(tickets).values([
        {
          requesterName: 'Pessoa de Teste',
          area: 'sistema',
          department: 'Comercial',
          problemType: 'bug',
          description: 'A tela não abre.',
          projectId: chamados.body.id,
          status: 'open',
        },
        {
          requesterName: 'Pessoa de Teste',
          area: 'sistema',
          department: 'Comercial',
          problemType: 'bug',
          description: 'Já resolvido.',
          projectId: chamados.body.id,
          status: 'resolved',
        },
      ]);

      const all = await api().get('/api/v1/software-projects').set(asEdu()).expect(200);
      expect(all.body.total).toBe(2);

      const active = await api()
        .get('/api/v1/software-projects?status=active')
        .set(asDora())
        .expect(200);
      expect(active.body.items).toHaveLength(1);
      expect(active.body.items[0].openTicketsCount).toBe(1);

      const search = await api()
        .get('/api/v1/software-projects?search=legado')
        .set(asDora())
        .expect(200);
      expect(search.body.items[0].name).toBe('Legado');

      const found = await api()
        .get(`/api/v1/software-projects/${chamados.body.id}`)
        .set(asEdu())
        .expect(200);
      expect(found.body.openTicketsCount).toBe(1);
    });

    it('updates and removes the system', async () => {
      const created = await registerProject({}).expect(201);

      const updated = await api()
        .patch(`/api/v1/software-projects/${created.body.id}`)
        .set(asDora())
        .send({ name: 'Chamados v2', status: 'maintenance', color: 'green' })
        .expect(200);
      expect(updated.body).toMatchObject({
        name: 'Chamados v2',
        status: 'maintenance',
        color: 'green',
      });

      await api().delete(`/api/v1/software-projects/${created.body.id}`).set(asDora()).expect(204);
      await api().get(`/api/v1/software-projects/${created.body.id}`).set(asDora()).expect(404);
    });

    it('synchronizes one system and all of them with the linked GitHub account', async () => {
      const created = await registerProject({}).expect(201);

      const one = await api()
        .post(`/api/v1/software-projects/${created.body.id}/sync-github`)
        .set(asDora())
        .expect(201);
      expect(one.body).toMatchObject({ synced: 1 });
      expect(one.body.message).toContain('1 Pull Requests');

      const all = await api().post('/api/v1/software-projects/sync-github').set(asDora()).expect(201);
      expect(all.body).toMatchObject({ projects: 1, prs: 1, issues: 0, merges: 0, failed: [] });

      const found = await api()
        .get(`/api/v1/software-projects/${created.body.id}`)
        .set(asDora())
        .expect(200);
      expect(found.body.pullRequestsCount).toBe(1);

      const timeline = await api()
        .get(`/api/v1/software-timeline?projectId=${created.body.id}&type=pr`)
        .set(asEdu())
        .expect(200);
      expect(timeline.body.total).toBe(1);
      expect(timeline.body.items[0]).toMatchObject({
        externalId: '#7',
        authorName: 'Dev Um',
        projectName: 'Chamados',
      });

      const window = await api()
        .get(
          '/api/v1/software-timeline?startAt=2026-10-01T00:00:00.000Z&endBefore=2026-10-02T00:00:00.000Z',
        )
        .set(asDora())
        .expect(200);
      expect(window.body.total).toBe(1);

      const dashboard = await api().get('/api/v1/software-dashboard').set(asDora()).expect(200);
      expect(dashboard.body).toBeTruthy();
    });

    // triste
    it('refuses the synchronization to whoever has not linked GitHub', async () => {
      const created = await registerProject({}).expect(201);
      await unlinkGithub(DORA.id);

      const refused = await api()
        .post(`/api/v1/software-projects/${created.body.id}/sync-github`)
        .set(asDora())
        .expect(403);
      expect(refused.body.message).toContain('Vincule sua conta do GitHub');

      await api().post('/api/v1/software-projects/sync-github').set(asEdu()).expect(403);

      /* Sem o vínculo, o módulo inteiro fecha para quem administra — a leitura inclusive. */
      const closed = await api().get('/api/v1/software-projects').set(asDora()).expect(403);
      expect(closed.body.message).toContain('Vincule sua conta do GitHub');
    });

    /* O responsável é confirmado no diretório de pessoas do admin-console; sem ele configurado,
       a resposta é "serviço fora", e não um responsável inventado. */
    it('cannot confirm a responsible without the people directory', async () => {
      const refused = await registerProject({ responsibleId: 'alguem-de-fora' }).expect(503);
      expect(refused.body.message).toEqual(expect.any(String));
    });

    it('answers 404 for a missing system and 400 for a body outside the contract', async () => {
      await api().get('/api/v1/software-projects/999999').set(asDora()).expect(404);
      await api()
        .patch('/api/v1/software-projects/999999')
        .set(asDora())
        .send({ name: 'x' })
        .expect(404);
      await api().delete('/api/v1/software-projects/999999').set(asDora()).expect(404);
      await registerProject({ status: 'inventado' }).expect(400);
    });

    it('keeps the role per module: readers consult, Infra admins do not enter', async () => {
      const created = await registerProject({}).expect(201);

      await api().get('/api/v1/software-projects').set(asEdu()).expect(200);
      await registerProject({}, asEdu()).expect(403);
      await api()
        .patch(`/api/v1/software-projects/${created.body.id}`)
        .set(asEdu())
        .send({ name: 'x' })
        .expect(403);
      await api().delete(`/api/v1/software-projects/${created.body.id}`).set(asEdu()).expect(403);

      await api().get('/api/v1/software-projects').set(asAna()).expect(403);
      await api().get('/api/v1/software-projects').expect(401);
    });
  });

  describe('schedule', () => {
    // feliz
    it('schedules an appointment and a record, naming the system', async () => {
      const project = await registerProject({}).expect(201);

      const appointment = await registerEvent({ projectId: project.body.id, note: '  Ao vivo. ' })
        .expect(201);
      expect(appointment.body).toMatchObject({
        kind: 'appointment',
        title: 'Deploy do Chamados',
        endTime: '10:00',
        createdById: DORA.id,
        createdByEmail: DORA.email,
        createdByName: 'Dora',
      });

      /* O registro marca só o momento: o fim que veio junto é descartado. */
      const record = await registerEvent({
        kind: 'record',
        title: 'Incidente no banco',
        category: 'other',
        date: '2026-10-21',
      }).expect(201);
      expect(record.body.endTime).toBeNull();

      const week = await api()
        .get('/api/v1/software-schedule?startDate=2026-10-19&endDate=2026-10-25')
        .set(asEdu())
        .expect(200);
      expect(week.body.map((event: { title: string }) => event.title)).toEqual([
        'Deploy do Chamados',
        'Incidente no banco',
      ]);
      expect(week.body[0].projectName).toBe('Chamados');

      const outside = await api()
        .get('/api/v1/software-schedule?startDate=2026-11-01&endDate=2026-11-07')
        .set(asDora())
        .expect(200);
      expect(outside.body).toEqual([]);

      const found = await api()
        .get(`/api/v1/software-schedule/${appointment.body.id}`)
        .set(asEdu())
        .expect(200);
      expect(found.body.projectName).toBe('Chamados');
    });

    it('lets who scheduled it (and the super admin) change and remove it', async () => {
      const created = await registerEvent({}).expect(201);

      const moved = await api()
        .patch(`/api/v1/software-schedule/${created.body.id}`)
        .set(asDora())
        .send({ startTime: '14:00', endTime: '15:30', note: '' })
        .expect(200);
      expect(moved.body).toMatchObject({ startTime: '14:00', endTime: '15:30', note: null });

      const asRecord = await api()
        .patch(`/api/v1/software-schedule/${created.body.id}`)
        .set(asOlga())
        .send({ kind: 'record', title: 'Virou registro' })
        .expect(200);
      expect(asRecord.body).toMatchObject({ kind: 'record', endTime: null });

      await api().delete(`/api/v1/software-schedule/${created.body.id}`).set(asOlga()).expect(204);
      await api().get(`/api/v1/software-schedule/${created.body.id}`).set(asDora()).expect(404);
    });

    // triste
    it('refuses an end before the start, on creation and on change', async () => {
      await registerEvent({ endTime: '08:00' }).expect(400);

      const created = await registerEvent({}).expect(201);
      const refused = await api()
        .patch(`/api/v1/software-schedule/${created.body.id}`)
        .set(asDora())
        .send({ endTime: '08:30' })
        .expect(400);
      expect(refused.body.message).toEqual(expect.any(String));
    });

    it('refuses to change what someone else scheduled', async () => {
      const created = await registerEvent({}, asOlga()).expect(201);

      const refused = await api()
        .patch(`/api/v1/software-schedule/${created.body.id}`)
        .set(asDora())
        .send({ title: 'Meu agora' })
        .expect(403);
      expect(refused.body.message).toContain('Só quem lançou');

      await api().delete(`/api/v1/software-schedule/${created.body.id}`).set(asDora()).expect(403);
    });

    it('answers 404 for a missing item and refuses who only consults', async () => {
      await api().get('/api/v1/software-schedule/999999').set(asDora()).expect(404);
      await api()
        .patch('/api/v1/software-schedule/999999')
        .set(asDora())
        .send({ title: 'x' })
        .expect(404);

      await registerEvent({}, asEdu()).expect(403);
      await api().get('/api/v1/software-schedule?startDate=2026-10-19&endDate=2026-10-25').expect(401);
    });
  });
});
