import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  ANA,
  BIA,
  asCaio,
  createE2eApp,
  directoryEntry,
  type E2eApp,
} from './support/e2e-app.util';

/**
 * O FILTRO "RESPONSÁVEL" e a FOTO do responsável na lista de máquinas.
 *
 * O cadastro guarda o ID da pessoa do diretório; o filtro manda o mesmo id, e o nome e a foto
 * vêm do diretório na resposta.
 *
 * Sem `TEST_DATABASE_URL` a suíte é pulada, e não falha.
 */
const testDatabaseUrl = process.env.TEST_DATABASE_URL;

describe.skipIf(!testDatabaseUrl)('Computers responsible filter API (e2e)', () => {
  let started: E2eApp;
  let app: INestApplication;

  const api = () => request(app.getHttpServer());

  const registerComputer = (name: string, responsibleId?: string) =>
    api()
      .post('/api/v1/computers')
      .set(asCaio())
      .send({ name, kind: 'desktop', responsibleId })
      .expect(201);

  const names = (response: { body: { items: { name: string }[] } }) =>
    response.body.items.map((item) => item.name).sort();

  beforeAll(async () => {
    started = await createE2eApp(testDatabaseUrl!, {
      people: [{ ...directoryEntry(ANA), image: '/avatars/ana.png' }, directoryEntry(BIA)],
    });
    app = started.app;
  });

  beforeEach(async () => {
    await started.truncate('computer_alerts', 'computer_samples', 'maintenances', 'computers');
    await registerComputer('RESP-ANA', ANA.id);
    await registerComputer('RESP-BIA', BIA.id);
    await registerComputer('RESP-NINGUEM');
  });

  afterAll(async () => {
    await app.close();
  });

  // feliz
  it('lists only the machines of the chosen person, by directory id', async () => {
    const response = await api()
      .get('/api/v1/computers')
      .query({ responsibleId: ANA.id })
      .set(asCaio())
      .expect(200);

    expect(names(response)).toEqual(['RESP-ANA']);
    expect(response.body.items[0]).toMatchObject({
      responsibleId: ANA.id,
      responsibleName: ANA.name,
      responsibleAvatarUrl: '/avatars/ana.png',
    });
  });

  // feliz
  it('lists the machines without responsible on "none"', async () => {
    const response = await api()
      .get('/api/v1/computers')
      .query({ responsibleId: 'none' })
      .set(asCaio())
      .expect(200);

    expect(names(response)).toEqual(['RESP-NINGUEM']);
  });

  // triste
  it('lists nothing for a person who is not in the directory, instead of everything', async () => {
    const response = await api()
      .get('/api/v1/computers')
      .query({ responsibleId: '00000000-0000-4000-8000-0000000000ee' })
      .set(asCaio())
      .expect(200);

    expect(response.body.total).toBe(0);
  });

  // triste
  it('falls back to no photo when the person has none in the directory', async () => {
    const response = await api()
      .get('/api/v1/computers')
      .query({ responsibleId: BIA.id })
      .set(asCaio())
      .expect(200);

    expect(response.body.items[0]).toMatchObject({
      responsibleId: BIA.id,
      responsibleAvatarUrl: null,
    });
  });
});
