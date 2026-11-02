import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { asAna, asOlga, BIA, CAIO, createE2eApp, type E2eApp } from './support/e2e-app.util';

/**
 * A TELA DE ACESSOS de ponta a ponta: liberar módulo (um, ou vários de uma vez), listar por
 * pessoa e tirar — tudo exclusivo da super-admin.
 *
 * O que só quebra aqui: o `on conflict` que faz liberar o mesmo módulo duas vezes virar uma
 * linha só, e o guard que fecha a porta para quem não é super-admin antes do service.
 *
 * Sem `TEST_DATABASE_URL` a suíte é pulada, e não falha.
 */
const testDatabaseUrl = process.env.TEST_DATABASE_URL;

describe.skipIf(!testDatabaseUrl)('Roles API (e2e)', () => {
  let started: E2eApp;
  let app: INestApplication;

  const api = () => request(app.getHttpServer());

  const grant = (body: Record<string, unknown>, who = asOlga()) =>
    api()
      .post('/api/roles')
      .set(who)
      .send({ userId: BIA.id, userEmail: BIA.email, context: 'sistema', ...body });

  beforeAll(async () => {
    started = await createE2eApp(testDatabaseUrl!);
    app = started.app;
  });

  beforeEach(async () => {
    await started.truncate('internal_roles');
  });

  afterAll(async () => {
    await app.close();
  });

  // feliz
  it('grants a module once, even when asked twice', async () => {
    const first = await grant({}).expect(201);
    expect(first.body).toMatchObject({
      userId: BIA.id,
      userEmail: BIA.email,
      context: 'sistema',
      createdBy: 'olga@empresa.com.br',
    });

    const again = await grant({}).expect(201);
    expect(again.body.id).toBe(first.body.id);
    expect(again.body.updatedBy).toBe('olga@empresa.com.br');

    const all = await api().get('/api/roles').set(asOlga()).expect(200);
    expect(all.body).toHaveLength(1);
  });

  it('grants several modules at once and lists them by person, by id or by e-mail', async () => {
    const granted = await api()
      .post('/api/roles/batch')
      .set(asOlga())
      .send({ userId: CAIO.id, userEmail: CAIO.email, contexts: ['infra', 'manutencao'] })
      .expect(201);
    expect(granted.body.map((role: { context: string }) => role.context).sort()).toEqual([
      'infra',
      'manutencao',
    ]);

    await grant({}).expect(201);

    const byId = await api().get(`/api/roles/user/${CAIO.id}`).set(asOlga()).expect(200);
    expect(byId.body.map((role: { context: string }) => role.context)).toEqual([
      'infra',
      'manutencao',
    ]);

    const byEmail = await api().get(`/api/roles/user/${BIA.email}`).set(asOlga()).expect(200);
    expect(byEmail.body).toHaveLength(1);

    /* Sem admin-console configurado, a lista de pessoas avisa que o serviço está fora. */
    await api().get('/api/roles/users').set(asOlga()).expect(503);
  });

  it('takes a module away', async () => {
    const granted = await grant({}).expect(201);

    await api().delete(`/api/roles/${granted.body.id}`).set(asOlga()).expect(204);

    const left = await api().get(`/api/roles/user/${BIA.id}`).set(asOlga()).expect(200);
    expect(left.body).toEqual([]);
  });

  // triste
  it('answers 404 when taking away what does not exist, and 400 outside the contract', async () => {
    await api().delete('/api/roles/999999').set(asOlga()).expect(404);
    await grant({ context: 'financeiro' }).expect(400);
    await api()
      .post('/api/roles/batch')
      .set(asOlga())
      .send({ userId: CAIO.id, contexts: ['infra', 'infra'] })
      .expect(400);
  });

  it('closes the door to whoever is not the super admin', async () => {
    await api().get('/api/roles').set(asAna()).expect(403);
    await grant({}, asAna()).expect(403);
    await api().get('/api/roles/users').set(asAna()).expect(403);
    await api().get('/api/roles').expect(401);
  });
});
