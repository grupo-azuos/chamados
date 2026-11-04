import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { asAna, asBia, asCaio, createE2eApp, type E2eApp } from './support/e2e-app.util';

/**
 * A TRANSFERÊNCIA DE MÁQUINA de ponta a ponta: a máquina muda de departamento, o histórico
 * guarda de onde para onde, e o periférico que fica na estação volta ao depósito e sai de
 * novo para a máquina que assume — duas linhas no extrato, saldo igual ao que era.
 *
 * O que só quebra aqui: a trava `for update`, a transação que junta as três escritas e a
 * conta `saída − entrada` por peça que diz o que está na mesa de alguém.
 *
 * Sem `TEST_DATABASE_URL` a suíte é pulada, e não falha.
 */
const testDatabaseUrl = process.env.TEST_DATABASE_URL;

describe.skipIf(!testDatabaseUrl)('Transfers API (e2e)', () => {
  let started: E2eApp;
  let app: INestApplication;

  const api = () => request(app.getHttpServer());

  const registerComputer = async (name: string, department: string | null = 'RECEPÇÃO') => {
    const created = await api()
      .post('/api/v1/computers')
      .set(asCaio())
      .send({ name, kind: 'desktop', department })
      .expect(201);

    return created.body.computer.id as number;
  };

  const registerPart = async (name: string, quantity: number): Promise<number> => {
    const created = await api()
      .post('/api/v1/parts')
      .set(asAna())
      .send({ name, category: 'keyboard', condition: 'new', initialQuantity: quantity })
      .expect(201);

    return created.body.id;
  };

  const handOut = (partId: number, computerId: number, quantity = 1) =>
    api()
      .post(`/api/v1/parts/${partId}/movements`)
      .set(asAna())
      .send({ type: 'out', quantity, computerId })
      .expect(201);

  const transfer = (computerId: number, body: Record<string, unknown>, who = asAna()) =>
    api().post(`/api/v1/computers/${computerId}/transfers`).set(who).send(body);

  beforeAll(async () => {
    started = await createE2eApp(testDatabaseUrl!);
    app = started.app;
  });

  beforeEach(async () => {
    await started.truncate('computer_transfers', 'part_movements', 'parts', 'computers');
  });

  afterAll(async () => {
    await app.close();
  });

  // feliz
  it('moves the machine and keeps where it came from in the history', async () => {
    const computerId = await registerComputer('PC-RECEPCAO-01');

    const moved = await transfer(computerId, {
      toDepartment: 'Fiscal',
      responsible: '  Joana  ',
      note: '',
    }).expect(201);

    expect(moved.body).toMatchObject({
      computerId,
      fromDepartment: 'RECEPÇÃO',
      toDepartment: 'Fiscal',
      responsible: 'Joana',
      note: null,
      peripheralsLeftBehind: 0,
      createdBy: 'ana@empresa.com.br',
    });

    const computer = await api().get(`/api/v1/computers/${computerId}`).set(asAna()).expect(200);
    expect(computer.body.department).toBe('Fiscal');

    /* De volta à prateleira: sem departamento. */
    await transfer(computerId, { toDepartment: null }).expect(201);

    const history = await api()
      .get(`/api/v1/computers/${computerId}/transfers`)
      .set(asBia())
      .expect(200);
    expect(history.body.map((item: { toDepartment: string | null }) => item.toDepartment)).toEqual(
      [null, 'Fiscal'],
    );
  });

  it('lists what is installed on the machine: what left the shelf for it and did not come back', async () => {
    const computerId = await registerComputer('PC-RECEPCAO-02');
    const keyboard = await registerPart('Teclado USB', 5);
    const mouse = await registerPart('Mouse USB', 5);
    await handOut(keyboard, computerId, 2);
    await handOut(mouse, computerId, 1);
    await api()
      .post(`/api/v1/parts/${mouse}/movements`)
      .set(asAna())
      .send({ type: 'in', quantity: 1, computerId })
      .expect(201);

    const installed = await api()
      .get(`/api/v1/computers/${computerId}/transfers/installed-parts`)
      .set(asBia())
      .expect(200);

    expect(installed.body).toEqual([
      { partId: keyboard, name: 'Teclado USB', category: 'keyboard', quantity: 2 },
    ]);
  });

  it('leaves the peripheral at the station: back to the shelf and out to the machine that stays', async () => {
    const leaving = await registerComputer('PC-RECEPCAO-03');
    const staying = await registerComputer('PC-RECEPCAO-04');
    const keyboard = await registerPart('Teclado ABNT', 3);
    await handOut(keyboard, leaving, 1);

    const moved = await transfer(leaving, {
      toDepartment: 'Fiscal',
      peripherals: [
        { partId: keyboard, quantity: 1, destiny: 'station', destinationComputerId: staying },
        { partId: keyboard, quantity: 1, destiny: 'machine' },
      ],
    }).expect(201);
    expect(moved.body.peripheralsLeftBehind).toBe(1);

    const part = await api().get(`/api/v1/parts/${keyboard}`).set(asAna()).expect(200);
    expect(part.body.balance).toBe(2);

    const statement = await api()
      .get(`/api/v1/parts/movements?partId=${keyboard}`)
      .set(asAna())
      .expect(200);
    expect(statement.body.total).toBe(4);
    expect(statement.body.items[0]).toMatchObject({ type: 'out', computerId: staying });
    expect(statement.body.items[1]).toMatchObject({ type: 'in', computerId: leaving });
    expect(statement.body.items[1].note).toContain('PC-RECEPCAO-03');

    const nowInstalled = await api()
      .get(`/api/v1/computers/${staying}/transfers/installed-parts`)
      .set(asAna())
      .expect(200);
    expect(nowInstalled.body[0]).toMatchObject({ partId: keyboard, quantity: 1 });
  });

  // triste
  it('refuses a transfer to the same department', async () => {
    const computerId = await registerComputer('PC-RECEPCAO-05');

    const refused = await transfer(computerId, { toDepartment: 'RECEPÇÃO' }).expect(422);
    expect(refused.body.message).toEqual(expect.any(String));
  });

  it('refuses a machine that is out of use, and a station without a machine that stays', async () => {
    const computerId = await registerComputer('PC-RECEPCAO-06');
    const keyboard = await registerPart('Teclado', 1);
    await handOut(keyboard, computerId, 1);

    await transfer(computerId, {
      toDepartment: 'Fiscal',
      peripherals: [{ partId: keyboard, quantity: 1, destiny: 'station' }],
    }).expect(400);

    await transfer(computerId, {
      toDepartment: 'Fiscal',
      peripherals: [
        { partId: keyboard, quantity: 1, destiny: 'station', destinationComputerId: 999999 },
      ],
    }).expect(404);

    await transfer(computerId, {
      toDepartment: 'Fiscal',
      peripherals: [
        { partId: 999999, quantity: 1, destiny: 'station', destinationComputerId: computerId },
      ],
    }).expect(404);

    await api()
      .post(`/api/v1/computers/${computerId}/disposal`)
      .set(asCaio())
      .send({ type: 'defect', reason: 'Placa-mãe queimada.' })
      .expect(201);
    const outOfUse = await transfer(computerId, { toDepartment: 'Fiscal' }).expect(422);
    expect(outOfUse.body.message).toEqual(expect.any(String));
  });

  it('answers 404 for a missing machine and refuses who only consults', async () => {
    await transfer(999999, { toDepartment: 'Fiscal' }).expect(404);

    const computerId = await registerComputer('PC-RECEPCAO-07');
    await transfer(computerId, { toDepartment: 'Fiscal' }, asBia()).expect(403);
    await api().get(`/api/v1/computers/${computerId}/transfers`).expect(401);
  });
});
