import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { internalRoles } from '../src/lib/db/schema/internal-roles.schema';
import {
  ANA,
  asAna,
  asBia,
  asCaio,
  asDora,
  BIA,
  CAIO,
  createE2eApp,
  directoryEntry,
  DORA,
  type E2eApp,
} from './support/e2e-app.util';

/**
 * A FILA DE CHAMADOS pelo lado de quem atende: os filtros traduzidos em SQL, o relatório nos
 * três formatos, as áreas participantes (#13), as pessoas vinculadas e "os meus chamados".
 *
 * O diretório de pessoas do admin-console é fingido (ver `e2e-app.util`): é dele que vem quem
 * pode ser vinculado e quem responde por uma área. Tudo o mais é o Postgres de verdade — o
 * `ilike` da busca, o `in` do grupo de situação e a junção com máquinas e sistemas.
 *
 * Sem `TEST_DATABASE_URL` a suíte é pulada, e não falha.
 */
const testDatabaseUrl = process.env.TEST_DATABASE_URL;

const PEDIDO = {
  requesterName: 'Marta da Recepção',
  area: 'infra',
  department: 'RECEPÇÃO',
  problemType: 'printer',
  contactPhone: '62 99999-1234',
  description: 'A impressora da recepção não puxa papel desde ontem.',
};

describe.skipIf(!testDatabaseUrl)('Tickets scope API (e2e)', () => {
  let started: E2eApp;
  let app: INestApplication;

  const api = () => request(app.getHttpServer());

  const open = (extra: Record<string, unknown> = {}, who = asAna()) =>
    api().post('/api/tickets').set(who).send({ ...PEDIDO, ...extra });

  const registerComputer = async (name: string): Promise<number> => {
    const created = await api()
      .post('/api/computers')
      .set(asCaio())
      .send({ name, kind: 'desktop', department: 'RECEPÇÃO' })
      .expect(201);

    return created.body.computer.id;
  };

  beforeAll(async () => {
    started = await createE2eApp(testDatabaseUrl!, {
      people: [ANA, BIA, CAIO, DORA].map(directoryEntry),
    });
    app = started.app;
  });

  /* Caio administra Infra (atende); Bia só consulta Infra; Dora administra Sistema. */
  beforeEach(async () => {
    await started.truncate(
      'tickets',
      'ticket_areas',
      'ticket_watchers',
      'ticket_histories',
      'computers',
      'internal_roles',
    );
    await started.db.insert(internalRoles).values([
      { userId: CAIO.id, userEmail: CAIO.email, context: 'infra' },
      { userId: BIA.id, userEmail: BIA.email, context: 'infra' },
      { userId: DORA.id, userEmail: DORA.email, context: 'sistema' },
    ]);
  });

  afterAll(async () => {
    await app.close();
  });

  // feliz
  it('filters the queue in the query: search, status group, priority, type, department and machine', async () => {
    const computerId = await registerComputer('PC-RECEPCAO-01');
    const first = await open({}).expect(201);
    /* O nome de quem pede vem da identidade: a busca por texto acha pela descrição. */
    await open({
      problemType: 'email',
      department: 'Fiscal',
      description: 'O e-mail da Joana não sincroniza.',
      priority: 'low',
    }).expect(201);
    /* A máquina entra pelo painel, por quem atende — quem abre não a escolhe. */
    await api()
      .patch(`/api/tickets/${first.body.id}`)
      .set(asCaio())
      .send({ priority: 'high', computerId })
      .expect(200);

    const byMachine = await api()
      .get(`/api/tickets?computerId=${computerId}`)
      .set(asCaio())
      .expect(200);
    expect(byMachine.body.total).toBe(1);
    expect(byMachine.body.items[0].computerName).toBe('PC-RECEPCAO-01');

    const byProtocol = await api().get('/api/tickets?search=CH-0001').set(asCaio()).expect(200);
    expect(byProtocol.body.total).toBe(1);

    const byText = await api().get('/api/tickets?search=sincroniza').set(asCaio()).expect(200);
    expect(byText.body.items[0].description).toContain('Joana');

    const high = await api()
      .get('/api/tickets?priority=high&problemType=printer&department=RECEPÇÃO&status=open')
      .set(asCaio())
      .expect(200);
    expect(high.body.total).toBe(1);

    const waiting = await api()
      .get('/api/tickets?statusGroup=waiting&area=infra')
      .set(asCaio())
      .expect(200);
    /* "Esperando" é só quem parou por alguém de fora: aberto não entra. */
    expect(waiting.body.total).toBe(0);

    const solved = await api().get('/api/tickets?statusGroup=solved').set(asBia()).expect(200);
    expect(solved.body.total).toBe(0);
  });

  it('exports the same queue in Excel, Word and PDF', async () => {
    await open({}).expect(201);
    await open({ description: 'O e-mail da Joana não sincroniza.', problemType: 'email' }).expect(201);

    for (const format of ['xlsx', 'docx', 'pdf']) {
      const file = await api()
        .get(`/api/tickets/export?format=${format}&search=sincroniza`)
        .set(asCaio())
        .buffer(true)
        .parse((response, callback) => {
          const chunks: Buffer[] = [];
          response.on('data', (chunk: Buffer) => chunks.push(chunk));
          response.on('end', () => callback(null, Buffer.concat(chunks)));
        })
        .expect(200);

      expect(file.headers['content-disposition']).toContain(`.${format}`);
      expect((file.body as Buffer).length).toBeGreaterThan(100);
    }

    await api().get('/api/tickets/export?format=csv').set(asCaio()).expect(400);
  });

  it('adds and removes a participant area, and the other area starts seeing the ticket', async () => {
    const created = await open({}).expect(201);

    await api().get(`/api/tickets/${created.body.id}`).set(asDora()).expect(403);

    const shared = await api()
      .post(`/api/tickets/${created.body.id}/areas`)
      .set(asCaio())
      .send({ area: 'sistema' })
      .expect(201);
    expect(shared.body.participantAreas).toEqual(['sistema']);

    const seenBySistema = await api().get('/api/tickets?area=sistema').set(asDora()).expect(200);
    expect(seenBySistema.body.total).toBe(1);
    await api().get(`/api/tickets/${created.body.id}`).set(asDora()).expect(200);

    const alone = await api()
      .delete(`/api/tickets/${created.body.id}/areas/sistema`)
      .set(asCaio())
      .expect(200);
    expect(alone.body.participantAreas).toEqual([]);
    await api().get(`/api/tickets/${created.body.id}`).set(asDora()).expect(403);
  });

  it('links people to the ticket and tells who can be notified', async () => {
    const created = await open({ watcherIds: [BIA.id] }).expect(201);

    const people = await api()
      .get(`/api/tickets/${created.body.id}/people`)
      .set(asCaio())
      .expect(200);
    expect(people.body.watchers).toEqual([{ id: BIA.id, name: 'Bia' }]);
    /* Quem abriu e quem está vinculado podem ser avisados; quem pergunta (Caio) não. */
    expect(people.body.notifiable).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: ANA.id }), { id: BIA.id, name: 'Bia' }]),
    );

    const replaced = await api()
      .put(`/api/tickets/${created.body.id}/watchers`)
      .set(asCaio())
      .send({ userIds: [DORA.id] })
      .expect(200);
    expect(replaced.body).toEqual([{ id: DORA.id, name: 'Dora' }]);

    /* Vinculada, Dora passa a ter o chamado entre "os meus", mesmo sem cargo em Infra. */
    const mine = await api().get('/api/tickets/mine').set(asDora()).expect(200);
    expect(mine.body.map((ticket: { id: number }) => ticket.id)).toEqual([created.body.id]);

    const unchanged = await api()
      .put(`/api/tickets/${created.body.id}/watchers`)
      .set(asCaio())
      .send({ userIds: [DORA.id] })
      .expect(200);
    expect(unchanged.body).toHaveLength(1);

    const options = await api().get('/api/tickets/people-options').set(asAna()).expect(200);
    expect(options.body.map((person: { name: string }) => person.name)).toEqual([
      'Ana',
      'Bia',
      'Caio',
      'Dora',
    ]);
  });

  it('lists the tickets the person opened or is linked to, with the requester defaults', async () => {
    await open({}).expect(201);
    await open({ requesterName: 'Caio' }, asCaio()).expect(201);
    await open({ watcherIds: [ANA.id] }, asCaio()).expect(201);

    const mine = await api().get('/api/tickets/mine').set(asAna()).expect(200);
    expect(mine.body).toHaveLength(2);

    const defaults = await api().get('/api/tickets/requester-defaults').set(asAna()).expect(200);
    expect(defaults.body).toMatchObject({
      name: 'Ana',
      email: 'ana@empresa.com.br',
      phone: '62 99999-1234',
    });

    const areas = await api().get('/api/tickets/areas/mine').set(asCaio()).expect(200);
    expect(areas.body).toEqual(['infra']);
  });

  it('offers as responsible only who administers the area', async () => {
    const infra = await api()
      .get('/api/tickets/assignee-options?area=infra')
      .set(asAna())
      .expect(200);
    expect(infra.body).toEqual([{ id: CAIO.id, name: 'Caio' }]);

    const sistema = await api()
      .get('/api/tickets/assignee-options?area=sistema')
      .set(asAna())
      .expect(200);
    expect(sistema.body).toEqual([{ id: DORA.id, name: 'Dora' }]);
  });

  // triste
  it('refuses to link someone the directory does not know', async () => {
    const created = await open({}).expect(201);

    const refused = await api()
      .put(`/api/tickets/${created.body.id}/watchers`)
      .set(asCaio())
      .send({ userIds: ['00000000-0000-4000-8000-0000000000ff'] })
      .expect(422);
    expect(refused.body.message).toContain('não está mais ativa');

    await api()
      .put('/api/tickets/999999/watchers')
      .set(asCaio())
      .send({ userIds: [] })
      .expect(404);
  });

  it('refuses whoever only consults to share the ticket or change its people', async () => {
    const created = await open({}).expect(201);

    await api()
      .post(`/api/tickets/${created.body.id}/areas`)
      .set(asBia())
      .send({ area: 'sistema' })
      .expect(403);
    await api()
      .put(`/api/tickets/${created.body.id}/watchers`)
      .set(asBia())
      .send({ userIds: [DORA.id] })
      .expect(403);
    await api()
      .post(`/api/tickets/${created.body.id}/areas`)
      .set(asCaio())
      .send({ area: 'financeiro' })
      .expect(400);
  });
});
