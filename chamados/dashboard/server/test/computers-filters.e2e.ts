import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { eq } from 'drizzle-orm';

import { computerAlerts } from '../src/lib/db/schema/computer-alerts.schema';
import { computerSamples } from '../src/lib/db/schema/computer-samples.schema';
import { computers } from '../src/lib/db/schema/computers.schema';
import { asAna, asBia, asCaio, createE2eApp, type E2eApp } from './support/e2e-app.util';

/**
 * A LISTA DE MÁQUINAS pelos filtros que viram SQL: presença, alerta aberto, preventiva, tipo e
 * saúde — e as leituras da ficha (uso e alertas) e o relatório nos três formatos.
 *
 * Cada filtro é uma subconsulta ou um `exists`, e é o Postgres que prova que eles batem com a
 * ficha: a máquina com "CPU elevada" na lista é a mesma com o alerta aberto na ficha.
 *
 * Sem `TEST_DATABASE_URL` a suíte é pulada, e não falha.
 */
const testDatabaseUrl = process.env.TEST_DATABASE_URL;

const NOW = new Date();
const EIGHT_MONTHS_AGO = new Date(NOW.getFullYear(), NOW.getMonth() - 8, 10);

describe.skipIf(!testDatabaseUrl)('Computers filters API (e2e)', () => {
  let started: E2eApp;
  let app: INestApplication;

  const api = () => request(app.getHttpServer());

  const registerComputer = async (name: string, extra: Record<string, unknown> = {}): Promise<number> => {
    const created = await api()
      .post('/api/computers')
      .set(asCaio())
      .send({ name, kind: 'desktop', department: 'RECEPÇÃO', ...extra })
      .expect(201);

    return created.body.computer.id;
  };

  const registerMaintenance = (computerId: number, type: string, performedAt: Date) =>
    api()
      .post('/api/maintenances')
      .set(asAna())
      .send({ computerId, type, performedAt: performedAt.toISOString() })
      .expect(201);

  const names = (response: { body: { items: { name: string }[] } }) =>
    response.body.items.map((item) => item.name).sort();

  beforeAll(async () => {
    started = await createE2eApp(testDatabaseUrl!);
    app = started.app;
  });

  beforeEach(async () => {
    await started.truncate('computer_alerts', 'computer_samples', 'maintenances', 'computers');
  });

  afterAll(async () => {
    await app.close();
  });

  // feliz
  it('filters by open alert, preventive status, kind and health', async () => {
    const withAlert = await registerComputer('PC-ALERTA');
    const preventiveOk = await registerComputer('PC-EM-DIA', { kind: 'notebook' });
    const preventiveDue = await registerComputer('PC-VENCIDA');
    await registerComputer('PC-NUNCA');

    await started.db.insert(computerAlerts).values([
      { computerId: withAlert, metric: 'cpu', peakValue: 97, threshold: 90, status: 'active', startedAt: NOW },
      {
        computerId: preventiveOk,
        metric: 'memory',
        peakValue: 95,
        threshold: 90,
        status: 'recovered',
        startedAt: NOW,
        recoveredAt: NOW,
      },
    ]);
    await registerMaintenance(preventiveOk, 'preventive', NOW);
    await registerMaintenance(preventiveDue, 'corrective', EIGHT_MONTHS_AGO);

    expect(names(await api().get('/api/computers?alert=any').set(asBia()).expect(200))).toEqual([
      'PC-ALERTA',
    ]);
    expect(names(await api().get('/api/computers?alert=cpu').set(asAna()).expect(200))).toEqual([
      'PC-ALERTA',
    ]);
    expect(names(await api().get('/api/computers?alert=memory').set(asAna()).expect(200))).toEqual(
      [],
    );

    expect(names(await api().get('/api/computers?preventive=ok').set(asAna()).expect(200))).toEqual(
      ['PC-EM-DIA'],
    );
    expect(names(await api().get('/api/computers?preventive=due').set(asAna()).expect(200))).toEqual(
      ['PC-VENCIDA'],
    );
    expect(
      names(await api().get('/api/computers?preventive=never').set(asAna()).expect(200)),
    ).toEqual(['PC-ALERTA', 'PC-NUNCA']);
    expect(
      names(await api().get('/api/computers?preventive=needed').set(asAna()).expect(200)),
    ).toEqual(['PC-ALERTA', 'PC-NUNCA', 'PC-VENCIDA']);

    expect(names(await api().get('/api/computers?kind=notebook').set(asAna()).expect(200))).toEqual(
      ['PC-EM-DIA'],
    );
    expect(
      names(await api().get('/api/computers?healthStatus=critical').set(asAna()).expect(200)),
    ).toEqual([]);
  });

  it('filters by the condition of the resources, the worst one first, with the health limits', async () => {
    const GB = 1024 ** 3;
    const DAY = 86_400;
    const readings: [string, Record<string, number | null>][] = [
      ['PC-DISCO-CHEIO', { totalDiskBytes: 100 * GB, freeDiskBytes: 2 * GB, totalMemoryBytes: 4 * GB }],
      ['PC-DISCO-BAIXO', { totalDiskBytes: 100 * GB, freeDiskBytes: 8 * GB, totalMemoryBytes: 16 * GB }],
      ['PC-POUCA-RAM', { totalDiskBytes: 100 * GB, freeDiskBytes: 60 * GB, totalMemoryBytes: 4 * GB }],
      ['PC-SEM-REINICIAR', { totalMemoryBytes: 16 * GB, uptimeSeconds: 45 * DAY }],
      ['PC-EM-DIA', { totalDiskBytes: 100 * GB, freeDiskBytes: 60 * GB, totalMemoryBytes: 16 * GB, uptimeSeconds: 2 * DAY }],
    ];
    for (const [name, values] of readings) {
      const id = await registerComputer(name);
      await started.db.update(computers).set(values).where(eq(computers.id, id));
    }
    await registerComputer('PC-SEM-LEITURA');

    const byCondition = async (condition: string) =>
      names(await api().get(`/api/computers?resourceCondition=${condition}`).set(asAna()).expect(200));

    expect(await byCondition('disk-critical')).toEqual(['PC-DISCO-CHEIO']);
    expect(await byCondition('disk-low')).toEqual(['PC-DISCO-BAIXO']);
    expect(await byCondition('memory-low')).toEqual(['PC-POUCA-RAM']);
    expect(await byCondition('stale-uptime')).toEqual(['PC-SEM-REINICIAR']);
    expect(await byCondition('ok')).toEqual(['PC-EM-DIA']);
    expect(await byCondition('unknown')).toEqual(['PC-SEM-LEITURA']);
    // triste
    await api().get('/api/computers?resourceCondition=quebrado').set(asAna()).expect(400);
  });

  it('filters by presence: nobody is online in the test, so offline is everyone', async () => {
    await registerComputer('PC-DESLIGADO');

    expect(names(await api().get('/api/computers?onlyOnline=true').set(asAna()).expect(200))).toEqual(
      [],
    );
    expect(
      names(await api().get('/api/computers?onlyOffline=true').set(asAna()).expect(200)),
    ).toEqual(['PC-DESLIGADO']);
  });

  it('lists the disposed machines by type, apart from the park', async () => {
    const scrapped = await registerComputer('PC-SUCATA');
    await registerComputer('PC-VIVO');
    await api()
      .post(`/api/computers/${scrapped}/disposal`)
      .set(asCaio())
      .send({ type: 'scrap', reason: 'Placa-mãe queimada e sem conserto.' })
      .expect(201);

    expect(names(await api().get('/api/computers').set(asAna()).expect(200))).toEqual(['PC-VIVO']);
    expect(
      names(
        await api()
          .get('/api/computers?onlyDisposed=true&disposalType=scrap')
          .set(asAna())
          .expect(200),
      ),
    ).toEqual(['PC-SUCATA']);
    expect(
      names(
        await api()
          .get('/api/computers?onlyDisposed=true&disposalType=defect')
          .set(asAna())
          .expect(200),
      ),
    ).toEqual([]);
  });

  it('reads the usage samples and the paged alerts of a machine', async () => {
    const id = await registerComputer('PC-FICHA');
    await started.db.insert(computerSamples).values([
      { computerId: id, sampledAt: NOW, cpuPercent: 40, memoryPercent: 60, diskPercent: 70 },
      {
        computerId: id,
        sampledAt: new Date(NOW.getTime() - 60_000),
        cpuPercent: 30,
        memoryPercent: 50,
        diskPercent: 70,
      },
    ]);
    await started.db.insert(computerAlerts).values([
      { computerId: id, metric: 'cpu', peakValue: 97, threshold: 90, status: 'active', startedAt: NOW },
      {
        computerId: id,
        metric: 'disk',
        peakValue: 96,
        threshold: 90,
        status: 'recovered',
        startedAt: new Date(NOW.getTime() - 60_000),
        recoveredAt: NOW,
      },
    ]);

    const samples = await api().get(`/api/computers/${id}/samples`).set(asBia()).expect(200);
    expect(samples.body).toHaveLength(2);

    const alerts = await api()
      .get(`/api/computers/${id}/alerts?page=1&pageSize=1`)
      .set(asBia())
      .expect(200);
    expect(alerts.body.total).toBe(2);
    expect(alerts.body.items).toHaveLength(1);
    expect(alerts.body.items[0].metric).toBe('cpu');

    const live = await api().get(`/api/computers/${id}/live`).set(asAna()).expect(200);
    expect(live.body).toBeTruthy();
  });

  it('exports the filtered park in Excel, Word and PDF', async () => {
    const measured = await registerComputer('PC-RELATORIO-01');
    await registerComputer('PC-RELATORIO-02', { kind: 'notebook' });
    const archived = await registerComputer('PC-ARQUIVADO');
    const disposed = await registerComputer('PC-DESCARTADO');
    /* O agente é quem mede a memória; aqui ela entra direto, só para o relatório formatá-la. */
    await started.db
      .update(computers)
      .set({ totalMemoryBytes: 8 * 1024 ** 3, os: 'Windows 11' })
      .where(eq(computers.id, measured));
    await api()
      .patch(`/api/computers/${archived}`)
      .set(asCaio())
      .send({ isArchived: true })
      .expect(200);
    await api()
      .post(`/api/computers/${disposed}/disposal`)
      .set(asCaio())
      .send({ type: 'defect', reason: 'Não liga mais.' })
      .expect(201);

    /* O parque inteiro, com as arquivadas, e só as descartadas: as três situações no papel. */
    const whole = await api()
      .get('/api/computers/export?format=xlsx&includeArchived=true')
      .set(asAna())
      .buffer(true)
      .parse((response, callback) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () => callback(null, Buffer.concat(chunks)));
      })
      .expect(200);
    expect((whole.body as Buffer).length).toBeGreaterThan(100);
    await api()
      .get('/api/computers/export?format=pdf&onlyDisposed=true')
      .set(asAna())
      .buffer(true)
      .parse((response, callback) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () => callback(null, Buffer.concat(chunks)));
      })
      .expect(200);

    for (const format of ['xlsx', 'docx', 'pdf']) {
      const file = await api()
        .get(`/api/computers/export?format=${format}&kind=notebook&onlyOffline=true`)
        .set(asAna())
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
  });

  // triste
  it('refuses a filter outside the contract and a machine that does not exist', async () => {
    await api().get('/api/computers?alert=gpu').set(asAna()).expect(400);
    await api().get('/api/computers?preventive=amanha').set(asAna()).expect(400);
    await api().get('/api/computers/export?format=txt').set(asAna()).expect(400);
    await api().get('/api/computers/999999/samples').set(asAna()).expect(404);
    await api().get('/api/computers/999999/alerts').set(asAna()).expect(404);
  });
});
