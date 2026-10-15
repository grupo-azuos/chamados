import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  asAna,
  asBia,
  asCaio,
  asStranger,
  CAIO,
  createE2eApp,
  type E2eApp,
} from './support/e2e-app.util';

/**
 * A API inteira, de ponta a ponta, contra um Postgres de verdade: migration, validação do
 * Zod, policy, restrição do banco e filtro de erro. É o que teste de unidade com repository
 * fingido não prova.
 *
 * O banco vem da `TEST_DATABASE_URL`, e precisa ser um banco SÓ DELE — um Postgres
 * descartável na máquina ou uma branch do banco na Neon (ver `server/.env.example`). Estes
 * testes esvaziam as tabelas antes de rodar; apontar para o banco de trabalho apagaria os
 * dados de quem estivesse usando o sistema.
 *
 * Sem `TEST_DATABASE_URL` a suíte é pulada, em vez de falhar: quem só mexeu na tela não
 * precisa de um banco na nuvem para rodar os testes.
 *
 * **O login em si não entra aqui.** Quem autentica é o admin-console, pelo proxy. Os
 * cabeçalhos que ele injeta são mandados de verdade; o que é fingido é só a leitura dos
 * módulos (`IdentityProvider`), cuja regra é assunto de `identity.provider.test.ts`. Daqui
 * para baixo, tudo o que a API faz com uma identidade já conhecida é real.
 */
const testDatabaseUrl = process.env.TEST_DATABASE_URL;

describe.skipIf(!testDatabaseUrl)('Tasks API (e2e)', () => {
  let started: E2eApp;
  let app: INestApplication;

  beforeAll(async () => {
    started = await createE2eApp(testDatabaseUrl!);
    app = started.app;

    /* Estado conhecido antes do primeiro teste. `RESTART IDENTITY` zera o contador de `id`
       junto: sem isso, os ids cresceriam a cada execução e qualquer asserção sobre eles só
       passaria na primeira vez. */
    await started.truncate('tasks');
  });

  afterAll(async () => {
    await app.close();
  });

  // feliz
  it('creates a task and lists it, stamping the author from the identity', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/tasks')
      .set(asAna())
      .send({ title: 'Ligar para o cliente', createdBy: 'someone@else.com' })
      .expect(201);

    expect(created.body).toMatchObject({
      title: 'Ligar para o cliente',
      status: 'todo',
      createdBy: 'ana@empresa.com.br',
    });

    const list = await request(app.getHttpServer()).get('/api/tasks').set(asAna()).expect(200);

    expect(list.body.total).toBeGreaterThanOrEqual(1);
  });

  it('updates only the fields that were sent', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/tasks')
      .set(asAna())
      .send({ title: 'Revisar contrato', description: 'Cláusula 4' })
      .expect(201);

    const updated = await request(app.getHttpServer())
      .patch(`/api/tasks/${created.body.id}`)
      .set(asAna())
      .send({ status: 'done' })
      .expect(200);

    expect(updated.body).toMatchObject({ status: 'done', description: 'Cláusula 4' });
  });

  it('tells who is logged in', async () => {
    const me = await request(app.getHttpServer()).get('/api/auth/me').set(asCaio()).expect(200);

    expect(me.body).toEqual({ ...CAIO, image: null });
  });

  it('lets an Administrator of the module change a task from someone else', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/tasks')
      .set(asAna())
      .send({ title: 'Tarefa da Ana' })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/tasks/${created.body.id}`)
      .set(asCaio())
      .send({ status: 'doing' })
      .expect(200);
  });

  // triste
  /* A tranca da API: sem identidade não se lê nem se escreve nada. */
  it('refuses a request without identity with 401', async () => {
    await request(app.getHttpServer()).get('/api/tasks').expect(401);
    await request(app.getHttpServer()).get('/api/auth/me').expect(401);
  });

  it('refuses someone the proxy identified but this system does not know, with 401', async () => {
    await request(app.getHttpServer()).get('/api/tasks').set(asStranger()).expect(401);
  });

  /* Cabeçalho pela metade é proxy mal configurado (ou forjado): ninguém entra. */
  it('refuses a half forwarded identity with 401', async () => {
    const { 'x-forwarded-user-email': _email, ...partial } = asAna();

    await request(app.getHttpServer()).get('/api/tasks').set(partial).expect(401);
  });

  /* Gestor do módulo só consulta: não altera nem apaga, nem o que é dos outros nem o seu. */
  it('refuses a Manager of the module any change, with 403', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/tasks')
      .set(asAna())
      .send({ title: 'Só a Ana mexe' })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/tasks/${created.body.id}`)
      .set(asBia())
      .send({ status: 'done' })
      .expect(403);

    await request(app.getHttpServer())
      .delete(`/api/tasks/${created.body.id}`)
      .set(asBia())
      .expect(403);
  });

  it('refuses an empty title with 4xx and names the field, in Portuguese', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/tasks')
      .set(asAna())
      .send({ title: '   ' });

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);
    expect(response.body.message).toBe('Confira os campos destacados.');
    expect(response.body.details).toContainEqual({ field: 'title', message: 'Informe o título' });
  });

  it('answers 404 for a task that does not exist', async () => {
    await request(app.getHttpServer()).get('/api/tasks/999999').set(asAna()).expect(404);
  });
});
