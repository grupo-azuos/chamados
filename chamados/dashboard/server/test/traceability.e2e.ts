import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { computers } from '../src/lib/db/schema/computers.schema';
import { ANA, asAna, asDora, createE2eApp, type E2eApp } from './support/e2e-app.util';

/**
 * A RASTREABILIDADE de ponta a ponta: a busca de pessoa lista TODO o escritório (o responsável pela
 * máquina pode não ter acesso ao Chamados), quem responde por máquina primeiro.
 *
 * Sem `TEST_DATABASE_URL` a suíte é pulada, e não falha.
 */
const testDatabaseUrl = process.env.TEST_DATABASE_URL;

/* Alguém do escritório que NÃO usa o Chamados, mas responde por uma máquina. */
const CARLA = {
  id: '00000000-0000-4000-8000-0000000000c1',
  name: 'Carla do Fiscal',
  email: 'carla@empresa.com.br',
  image: null,
};

describe.skipIf(!testDatabaseUrl)('Traceability API (e2e)', () => {
  let started: E2eApp;
  let app: INestApplication;
  const api = () => request(app.getHttpServer());

  beforeAll(async () => {
    process.env.BACKGROUND_JOBS_ENABLED = 'false';
    started = await createE2eApp(testDatabaseUrl!, {
      people: [{ id: ANA.id, name: ANA.name, email: ANA.email, image: null }, CARLA],
    });
    app = started.app;
  });

  beforeEach(async () => {
    await started.truncate('computers');
  });

  afterAll(async () => {
    await app.close();
    delete process.env.BACKGROUND_JOBS_ENABLED;
  });

  // feliz
  it('lists the whole office, PC responsibles first with how many machines', async () => {
    await started.db.insert(computers).values([
      {
        name: 'FISCAL-D01',
        tokenHash: 'hash-1',
        responsibleId: CARLA.id,
        createdBy: 'ti@empresa.com.br',
      },
      {
        name: 'FISCAL-D02',
        tokenHash: 'hash-2',
        responsibleId: CARLA.id,
        createdBy: 'ti@empresa.com.br',
      },
    ]);

    const people = await api().get('/api/v1/traceability/people').set(asAna()).expect(200);

    expect(people.body).toEqual([
      { id: CARLA.id, name: CARLA.name, avatarUrl: null, computers: 2 },
      { id: ANA.id, name: ANA.name, avatarUrl: null, computers: 0 },
    ]);
    const graph = await api()
      .get('/api/v1/traceability')
      .query({ focus: 'person', id: CARLA.id })
      .set(asAna())
      .expect(200);
    expect(
      graph.body.nodes.filter((node: { kind: string }) => node.kind === 'computer'),
    ).toHaveLength(2);
  });

  // triste
  it('refuses whoever has no role in Infraestrutura', async () => {
    await api().get('/api/v1/traceability/people').set(asDora()).expect(403);
  });
});
