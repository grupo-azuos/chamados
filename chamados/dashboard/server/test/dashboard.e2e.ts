import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { computerAlerts } from '../src/lib/db/schema/computer-alerts.schema';
import { maintenanceSchedules } from '../src/lib/db/schema/maintenance-schedules.schema';
import { tickets } from '../src/lib/db/schema/tickets.schema';
import { asAna, asBia, asCaio, createE2eApp, type E2eApp } from './support/e2e-app.util';

/**
 * O PAINEL DA INFRAESTRUTURA de ponta a ponta: uma leitura só junta o parque, os chamados, as
 * manutenções, o depósito e os painéis de recorrência — cada número é uma consulta com
 * `count(*) filter`, agrupamento e `having`, e só o Postgres prova que elas fecham.
 *
 * Sem `TEST_DATABASE_URL` a suíte é pulada, e não falha.
 */
const testDatabaseUrl = process.env.TEST_DATABASE_URL;

const NOW = new Date();
const TODAY = NOW.toISOString().slice(0, 10);

describe.skipIf(!testDatabaseUrl)('Dashboard API (e2e)', () => {
  let started: E2eApp;
  let app: INestApplication;

  const api = () => request(app.getHttpServer());

  const registerComputer = async (name: string, department = 'RECEPÇÃO'): Promise<number> => {
    const created = await api()
      .post('/api/v1/computers')
      .set(asCaio())
      .send({ name, kind: 'desktop', department })
      .expect(201);

    return created.body.computer.id;
  };

  const registerMaintenance = (computerId: number, type: string, performedAt = NOW) =>
    api()
      .post('/api/v1/maintenances')
      .set(asAna())
      .send({ computerId, type, performedAt: performedAt.toISOString(), description: 'Feito.' })
      .expect(201);

  const ticket = (overrides: Partial<typeof tickets.$inferInsert> = {}): typeof tickets.$inferInsert => ({
    requesterName: 'Marta',
    area: 'infra',
    department: 'RECEPÇÃO',
    problemType: 'printer',
    description: 'A máquina não liga.',
    createdAt: NOW,
    ...overrides,
  });

  beforeAll(async () => {
    started = await createE2eApp(testDatabaseUrl!);
    app = started.app;
  });

  beforeEach(async () => {
    await started.truncate(
      'tickets',
      'computer_alerts',
      'maintenance_schedules',
      'maintenances',
      'part_movements',
      'parts',
      'computers',
    );
  });

  afterAll(async () => {
    await app.close();
  });

  // feliz
  it('answers zeroed with an empty park', async () => {
    const summary = await api().get('/api/v1/dashboard').set(asBia()).expect(200);

    expect(summary.body).toMatchObject({
      park: { total: 0, critical: 0, attention: 0, neverSeen: 0 },
      tickets: { open: 0, inProgress: 0, openedInPeriod: 0, resolvedInPeriod: 0 },
      parts: { kinds: 0, items: 0, outOfStock: 0 },
      worstMachines: [],
      byProblemType: [],
      byDepartment: [],
    });
    expect(summary.body.tickets.averageResolutionHours).toBeNull();
    expect(summary.body.panels.doneToday).toBe(false);
  });

  it('adds up the park, the tickets, the maintenances and the shelf of the period', async () => {
    const recepcao = await registerComputer('PC-RECEPCAO-01');
    const fiscal = await registerComputer('PC-FISCAL-01', 'Fiscal');
    await registerComputer('PC-SEM-DEPTO', 'Fiscal');

    await started.db.insert(tickets).values([
      ticket({ computerId: recepcao, status: 'open' }),
      ticket({ computerId: recepcao, status: 'in_progress' }),
      ticket({
        computerId: recepcao,
        status: 'resolved',
        resolvedAt: new Date(NOW.getTime() + 2 * 3_600_000),
      }),
      ticket({ requesterName: 'Joana', department: 'Fiscal', problemType: 'email' }),
      ticket({ requesterName: 'Joana', department: 'Fiscal', problemType: 'email' }),
      ticket({ requesterName: 'Joana', department: 'Fiscal', problemType: 'email' }),
    ]);

    await started.db.insert(computerAlerts).values([
      { computerId: recepcao, metric: 'cpu', peakValue: 97, threshold: 90, status: 'active', startedAt: NOW },
      {
        computerId: recepcao,
        metric: 'memory',
        peakValue: 95,
        threshold: 90,
        status: 'recovered',
        startedAt: NOW,
        recoveredAt: NOW,
      },
    ]);

    await registerMaintenance(recepcao, 'preventive');
    await registerMaintenance(recepcao, 'cleaning');
    await registerMaintenance(recepcao, 'corrective');
    await registerMaintenance(fiscal, 'corrective');
    await registerMaintenance(
      fiscal,
      'preventive',
      new Date(NOW.getFullYear(), NOW.getMonth() - 8, 10),
    );

    await started.db.insert(maintenanceSchedules).values([
      { computerId: fiscal, scheduledFor: TODAY, note: 'Trocar a pasta térmica.', createdBy: 'ana@empresa.com.br' },
    ]);

    await api()
      .post('/api/v1/parts')
      .set(asAna())
      .send({ name: 'SSD', category: 'ssd', condition: 'new', initialQuantity: 3 })
      .expect(201);
    await api()
      .post('/api/v1/parts')
      .set(asAna())
      .send({ name: 'Mouse', category: 'mouse', condition: 'used' })
      .expect(201);

    const summary = await api().get('/api/v1/dashboard?days=30').set(asAna()).expect(200);

    expect(summary.body.days).toBe(30);
    expect(summary.body.park).toMatchObject({ total: 3, neverSeen: 3 });
    expect(summary.body.tickets).toMatchObject({
      open: 4,
      inProgress: 1,
      openedInPeriod: 6,
      resolvedInPeriod: 1,
      averageResolutionHours: 2,
    });
    expect(summary.body.maintenance.doneInPeriod).toBe(4);
    expect(summary.body.parts).toMatchObject({ kinds: 2, items: 3, outOfStock: 1 });
    expect(summary.body.byProblemType).toEqual(
      expect.arrayContaining([{ key: 'email', count: 3 }]),
    );
    expect(summary.body.byDepartment).toEqual(expect.arrayContaining([{ key: 'Fiscal', count: 3 }]));
    expect(summary.body.daily.length).toBeGreaterThan(0);

    const machines = summary.body.worstMachines.map(
      (machine: { computerName: string; activeAlerts: number }) => machine,
    );
    expect(machines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ computerName: 'PC-RECEPCAO-01', activeAlerts: 1 }),
      ]),
    );

    const panels = summary.body.panels;
    expect(panels.recurringByPerson).toEqual(
      expect.arrayContaining([expect.objectContaining({ requesterName: 'Joana', count: 3 })]),
    );
    expect(panels.recurringByMachine).toEqual(
      expect.arrayContaining([expect.objectContaining({ computerName: 'PC-RECEPCAO-01' })]),
    );
    expect(panels.heavyMaintenance).toEqual(
      expect.arrayContaining([expect.objectContaining({ computerName: 'PC-RECEPCAO-01' })]),
    );
    expect(panels.maintenanceLog.month.length).toBeGreaterThan(0);
    expect(panels.maintenanceByType.month).toEqual(
      expect.arrayContaining([expect.objectContaining({ key: 'corrective' })]),
    );
    expect(panels.scheduled).toEqual(
      expect.arrayContaining([expect.objectContaining({ computerName: 'PC-FISCAL-01' })]),
    );
    expect(panels.doneToday).toBe(true);
  });

  // triste
  it('refuses a period outside the contract and requires a session', async () => {
    await api().get('/api/v1/dashboard?days=0').set(asAna()).expect(400);
    await api().get('/api/v1/dashboard?days=abc').set(asAna()).expect(400);
    await api().get('/api/v1/dashboard').expect(401);
  });
});
