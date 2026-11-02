import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { asAna, asBia, asCaio, createE2eApp, type E2eApp } from './support/e2e-app.util';

/**
 * O DEPÓSITO de ponta a ponta: a peça nasce com a primeira entrada no extrato, a saída é
 * conferida contra a prateleira, e a exclusão de uma linha refaz o saldo das seguintes.
 *
 * O que só quebra aqui: a trava `for update` e a transação (movimento e saldo juntos), o
 * `ilike` do Postgres, a junção com o inventário (o nome da máquina vem de lá a cada leitura)
 * e o filtro traduzido em SQL. Service com repository fingido não exercita nada disso.
 *
 * Sem `TEST_DATABASE_URL` a suíte é pulada, e não falha.
 */
const testDatabaseUrl = process.env.TEST_DATABASE_URL;

describe.skipIf(!testDatabaseUrl)('Parts API (e2e)', () => {
  let started: E2eApp;
  let app: INestApplication;

  const api = () => request(app.getHttpServer());

  const registerPart = (body: Record<string, unknown>, who = asAna()) =>
    api()
      .post('/api/parts')
      .set(who)
      .send({ name: 'SSD 240 GB', category: 'ssd', condition: 'new', ...body });

  const registerComputer = async (name: string): Promise<number> => {
    const created = await api()
      .post('/api/computers')
      .set(asCaio())
      .send({ name, kind: 'desktop', department: 'RECEPÇÃO' })
      .expect(201);

    return created.body.computer.id;
  };

  const move = (partId: number, body: Record<string, unknown>, who = asAna()) =>
    api().post(`/api/parts/${partId}/movements`).set(who).send(body);

  beforeAll(async () => {
    started = await createE2eApp(testDatabaseUrl!);
    app = started.app;
  });

  beforeEach(async () => {
    await started.truncate('part_movements', 'parts', 'computers');
  });

  afterAll(async () => {
    await app.close();
  });

  // feliz
  it('turns the initial quantity into the first entry of the statement', async () => {
    const created = await registerPart({ initialQuantity: 3, createdBy: 'caio@empresa.com.br' })
      .expect(201);

    expect(created.body).toMatchObject({
      name: 'SSD 240 GB',
      balance: 3,
      /* Autoria vem da identidade, nunca do corpo. */
      createdBy: 'ana@empresa.com.br',
    });

    const movements = await api()
      .get(`/api/parts/movements?partId=${created.body.id}`)
      .set(asAna())
      .expect(200);

    expect(movements.body.total).toBe(1);
    expect(movements.body.items[0]).toMatchObject({
      type: 'in',
      quantity: 3,
      balanceAfter: 3,
      partName: 'SSD 240 GB',
      note: 'Quantidade informada no cadastro da peça.',
    });
  });

  it('registers a part with no quantity and no movement', async () => {
    const created = await registerPart({ name: 'Mouse USB', category: 'mouse' }).expect(201);

    expect(created.body.balance).toBe(0);

    const movements = await api()
      .get(`/api/parts/movements?partId=${created.body.id}`)
      .set(asAna())
      .expect(200);

    expect(movements.body.total).toBe(0);
  });

  it('lists by category and then by name, filtered in the query', async () => {
    await registerPart({ name: 'Monitor 24"', category: 'monitor', initialQuantity: 1 }).expect(201);
    await registerPart({ name: 'SSD 480 GB', category: 'ssd', condition: 'used' }).expect(201);
    await registerPart({ name: 'SSD 240 GB', category: 'ssd', initialQuantity: 2 }).expect(201);

    const all = await api().get('/api/parts').set(asBia()).expect(200);
    expect(all.body.items.map((part: { name: string }) => part.name)).toEqual([
      'Monitor 24"',
      'SSD 240 GB',
      'SSD 480 GB',
    ]);

    const search = await api().get('/api/parts?search=ssd').set(asAna()).expect(200);
    expect(search.body.total).toBe(2);

    const used = await api().get('/api/parts?condition=used').set(asAna()).expect(200);
    expect(used.body.items).toHaveLength(1);

    const inStock = await api()
      .get('/api/parts?category=ssd&inStockOnly=true')
      .set(asAna())
      .expect(200);
    expect(inStock.body.items.map((part: { name: string }) => part.name)).toEqual(['SSD 240 GB']);

    const outOfStock = await api().get('/api/parts?outOfStockOnly=true').set(asAna()).expect(200);
    expect(outOfStock.body.items.map((part: { name: string }) => part.name)).toEqual(['SSD 480 GB']);

    const paged = await api().get('/api/parts?page=2&pageSize=2').set(asAna()).expect(200);
    expect(paged.body).toMatchObject({ total: 3, page: 2, pageSize: 2 });
    expect(paged.body.items).toHaveLength(1);
  });

  it('opens and corrects a part without touching its balance', async () => {
    const created = await registerPart({ initialQuantity: 4 }).expect(201);

    const found = await api().get(`/api/parts/${created.body.id}`).set(asBia()).expect(200);
    expect(found.body.balance).toBe(4);

    /* Caio é administrador: corrige o que Ana cadastrou. */
    const updated = await api()
      .patch(`/api/parts/${created.body.id}`)
      .set(asCaio())
      .send({ name: 'SSD 240 GB Kingston', condition: 'used', balance: 99 })
      .expect(200);

    expect(updated.body).toMatchObject({
      name: 'SSD 240 GB Kingston',
      condition: 'used',
      balance: 4,
      updatedBy: 'caio@empresa.com.br',
    });
  });

  it('moves the balance together with the statement line, naming the machine', async () => {
    const computerId = await registerComputer('PC-RECEPCAO-01');
    const part = await registerPart({ initialQuantity: 5 }).expect(201);

    const out = await move(part.body.id, {
      type: 'out',
      quantity: 2,
      computerId,
      handledBy: 'Marta',
      note: 'Troca do disco.',
    }).expect(201);

    expect(out.body).toMatchObject({
      type: 'out',
      quantity: 2,
      balanceAfter: 3,
      computerId,
      computerName: 'PC-RECEPCAO-01',
      computerDepartment: 'RECEPÇÃO',
      handledBy: 'Marta',
      createdBy: 'ana@empresa.com.br',
    });

    const reloaded = await api().get(`/api/parts/${part.body.id}`).set(asAna()).expect(200);
    expect(reloaded.body.balance).toBe(3);

    const byMachine = await api()
      .get(`/api/parts/movements?computerId=${computerId}&type=out`)
      .set(asAna())
      .expect(200);
    expect(byMachine.body.total).toBe(1);

    const entries = await api().get('/api/parts/movements?type=in').set(asAna()).expect(200);
    expect(entries.body.total).toBe(1);
  });

  it('corrects who took the part and the note of a movement', async () => {
    const part = await registerPart({ initialQuantity: 1 }).expect(201);
    const out = await move(part.body.id, { type: 'out', quantity: 1 }).expect(201);

    const updated = await api()
      .patch(`/api/parts/movements/${out.body.id}`)
      .set(asAna())
      .send({ handledBy: 'João', note: 'Levou para a sala 2.' })
      .expect(200);

    expect(updated.body).toMatchObject({
      handledBy: 'João',
      note: 'Levou para a sala 2.',
      quantity: 1,
      updatedBy: 'ana@empresa.com.br',
    });
  });

  it('deleting a movement gives the balance back and rewrites the following lines', async () => {
    const part = await registerPart({ initialQuantity: 10 }).expect(201);
    const first = await move(part.body.id, { type: 'out', quantity: 4 }).expect(201);
    const second = await move(part.body.id, { type: 'out', quantity: 3 }).expect(201);
    expect(second.body.balanceAfter).toBe(3);

    await api().delete(`/api/parts/movements/${first.body.id}`).set(asAna()).expect(204);

    const reloaded = await api().get(`/api/parts/${part.body.id}`).set(asAna()).expect(200);
    expect(reloaded.body.balance).toBe(7);

    const statement = await api()
      .get(`/api/parts/movements?partId=${part.body.id}`)
      .set(asAna())
      .expect(200);
    const remaining = statement.body.items.find(
      (item: { id: number }) => item.id === second.body.id,
    );
    expect(remaining.balanceAfter).toBe(7);
  });

  // triste
  it('refuses an exit bigger than the shelf, saying the number', async () => {
    const part = await registerPart({ initialQuantity: 2 }).expect(201);

    const refused = await move(part.body.id, { type: 'out', quantity: 5 }).expect(422);
    expect(refused.body.message).toContain('Só há 2 de SSD 240 GB');

    const empty = await registerPart({ name: 'Teclado', category: 'keyboard' }).expect(201);
    const fromEmpty = await move(empty.body.id, { type: 'out', quantity: 1 }).expect(422);
    expect(fromEmpty.body.message).toContain('Não há Teclado no depósito');
  });

  it('answers 404 for a part or a movement that does not exist', async () => {
    await api().get('/api/parts/999999').set(asAna()).expect(404);
    await api().patch('/api/parts/999999').set(asAna()).send({ name: 'x' }).expect(404);
    await move(999999, { type: 'in', quantity: 1 }).expect(404);
    await api()
      .patch('/api/parts/movements/999999')
      .set(asAna())
      .send({ note: 'x' })
      .expect(404);
    await api().delete('/api/parts/movements/999999').set(asAna()).expect(404);
  });

  it('refuses a body outside the contract', async () => {
    await registerPart({ category: 'cadeira' }).expect(400);

    const part = await registerPart({}).expect(201);
    await move(part.body.id, { type: 'in', quantity: 0 }).expect(400);
    await move(part.body.id, { type: 'in', quantity: 1000 }).expect(400);
  });

  it('lets whoever only consults read, and refuses them to write', async () => {
    const part = await registerPart({ initialQuantity: 1 }).expect(201);

    await api().get('/api/parts').set(asBia()).expect(200);
    await api().get('/api/parts/movements').set(asBia()).expect(200);

    await registerPart({}, asBia()).expect(403);
    await move(part.body.id, { type: 'in', quantity: 1 }, asBia()).expect(403);
    await api().patch(`/api/parts/${part.body.id}`).set(asBia()).send({ name: 'x' }).expect(403);
  });

  it('requires a session on every route', async () => {
    await api().get('/api/parts').expect(401);
    await api().post('/api/parts').send({ name: 'x' }).expect(401);
  });
});
