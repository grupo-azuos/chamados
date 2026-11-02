import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { asAna, asDora, asEdu, createE2eApp, type E2eApp } from './support/e2e-app.util';

/**
 * O INVENTÁRIO DA MANUTENÇÃO de ponta a ponta: produto com foto, o depósito (entrada, saída e
 * descarte) e a régua de cargo POR ÁREA — quem administra Infraestrutura não mexe aqui.
 *
 * O storage é o de memória: o teste faz o papel do navegador (pede o link, põe o arquivo) e a
 * API confere, move e apaga de verdade. A foto é pequena e não é uma imagem válida: o ffmpeg
 * não dá conta, e o original é promovido — o caminho que o cadastro precisa aguentar.
 *
 * Sem `TEST_DATABASE_URL` a suíte é pulada, e não falha.
 */
const testDatabaseUrl = process.env.TEST_DATABASE_URL;

const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');

describe.skipIf(!testDatabaseUrl)('Inventory items API (e2e)', () => {
  let started: E2eApp;
  let app: INestApplication;

  const api = () => request(app.getHttpServer());

  const sendPhoto = async (
    file: { content: Buffer; fileName: string; contentType: string },
    who = asDora(),
  ) => {
    const ticket = await api()
      .post('/api/inventory-items/photo/upload-url')
      .set(who)
      .send({
        fileName: file.fileName,
        contentType: file.contentType,
        sizeBytes: file.content.length,
      })
      .expect(201);
    await started.storage.put(ticket.body.storageKey, file.content, file.contentType);

    return { storageKey: ticket.body.storageKey as string, fileName: file.fileName };
  };

  const photo = () => ({ content: PNG, fileName: 'cadeira.png', contentType: 'image/png' });

  const registerItem = (body: Record<string, unknown>, who = asDora()) =>
    api()
      .post('/api/inventory-items')
      .set(who)
      .send({ name: 'Cadeira giratória', category: 'furniture', unit: 'unit', ...body });

  const move = (itemId: number, body: Record<string, unknown>, who = asDora()) =>
    api().post(`/api/inventory-items/${itemId}/movements`).set(who).send(body);

  beforeAll(async () => {
    started = await createE2eApp(testDatabaseUrl!);
    app = started.app;
  });

  beforeEach(async () => {
    await started.truncate('inventory_movements', 'inventory_items');
    await started.storage.remove(
      (await started.storage.list('', 10_000, () => true)).map((file) => file.key),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  // feliz
  it('registers a product with its photo, moved out of the staging area', async () => {
    const created = await registerItem({
      location: 'Sala da fiscal',
      code: 'PAT-001',
      note: '',
      photo: await sendPhoto(photo()),
      createdBy: 'ana@empresa.com.br',
    }).expect(201);

    expect(created.body).toMatchObject({
      name: 'Cadeira giratória',
      location: 'Sala da fiscal',
      code: 'PAT-001',
      note: null,
      balance: 0,
      createdBy: 'dora@empresa.com.br',
    });
    expect(created.body.photoUrl).toEqual(expect.any(String));

    /* Só o arquivo definitivo sobrou: a área temporária foi esvaziada. */
    const keys = (await started.storage.list('', 100, () => true)).map((file) => file.key);
    expect(keys).toHaveLength(1);
    expect(keys[0]).toMatch(/^inventory\//);
  });

  it('lists by category and name, with the filters translated to SQL', async () => {
    await registerItem({ name: 'Mesa', category: 'furniture', photo: await sendPhoto(photo()) })
      .expect(201);
    await registerItem({ name: 'Café', category: 'pantry', unit: 'package' }).expect(201);
    await registerItem({ name: 'Cadeira', category: 'furniture', code: 'PAT-77' }).expect(201);

    const all = await api().get('/api/inventory-items').set(asEdu()).expect(200);
    expect(all.body.items.map((item: { name: string }) => item.name)).toEqual([
      'Cadeira',
      'Mesa',
      'Café',
    ]);

    const furniture = await api()
      .get('/api/inventory-items?category=furniture')
      .set(asDora())
      .expect(200);
    expect(furniture.body.total).toBe(2);

    const byCode = await api().get('/api/inventory-items?search=pat-77').set(asDora()).expect(200);
    expect(byCode.body.items.map((item: { name: string }) => item.name)).toEqual(['Cadeira']);

    const withoutPhoto = await api()
      .get('/api/inventory-items?withoutPhotoOnly=true&outOfStockOnly=true')
      .set(asDora())
      .expect(200);
    expect(withoutPhoto.body.total).toBe(2);

    const paged = await api()
      .get('/api/inventory-items?page=2&pageSize=2')
      .set(asDora())
      .expect(200);
    expect(paged.body.items).toHaveLength(1);
  });

  it('replaces and removes the photo, discarding the old file from the bucket', async () => {
    const created = await registerItem({ photo: await sendPhoto(photo()) }).expect(201);

    const replaced = await api()
      .patch(`/api/inventory-items/${created.body.id}`)
      .set(asDora())
      .send({ name: 'Cadeira presidente', photo: await sendPhoto(photo()) })
      .expect(200);
    expect(replaced.body).toMatchObject({
      name: 'Cadeira presidente',
      updatedBy: 'dora@empresa.com.br',
    });
    expect(started.storage.size).toBe(1);

    const removed = await api()
      .patch(`/api/inventory-items/${created.body.id}`)
      .set(asDora())
      .send({ removePhoto: true })
      .expect(200);
    expect(removed.body.photoUrl).toBeNull();
    expect(started.storage.size).toBe(0);

    const found = await api()
      .get(`/api/inventory-items/${created.body.id}`)
      .set(asEdu())
      .expect(200);
    expect(found.body.photoUrl).toBeNull();
  });

  it('deletes the product together with its photo', async () => {
    const created = await registerItem({ photo: await sendPhoto(photo()) }).expect(201);

    await api().delete(`/api/inventory-items/${created.body.id}`).set(asDora()).expect(204);

    expect(started.storage.size).toBe(0);
    await api().get(`/api/inventory-items/${created.body.id}`).set(asDora()).expect(404);
  });

  it('moves the balance with the statement: entry, exit and disposal', async () => {
    const created = await registerItem({ name: 'Detergente', category: 'cleaning', unit: 'liter' })
      .expect(201);
    const id = created.body.id;

    const entry = await move(id, { type: 'in', quantity: 5, note: 'Compra do mês.' }).expect(201);
    expect(entry.body).toMatchObject({
      type: 'in',
      quantity: 5,
      balanceAfter: 5,
      itemName: 'Detergente',
      itemUnit: 'liter',
      createdBy: 'dora@empresa.com.br',
    });

    await move(id, { type: 'out', quantity: 2, note: '' }).expect(201);
    const disposal = await move(id, { type: 'disposal', quantity: 1, reason: 'expired' }).expect(201);
    expect(disposal.body).toMatchObject({ balanceAfter: 2, reason: 'expired', note: null });

    const reloaded = await api().get(`/api/inventory-items/${id}`).set(asDora()).expect(200);
    expect(reloaded.body.balance).toBe(2);

    const statement = await api()
      .get(`/api/inventory-items/movements?itemId=${id}`)
      .set(asEdu())
      .expect(200);
    expect(statement.body.total).toBe(3);
    expect(statement.body.items[0].type).toBe('disposal');

    const disposals = await api()
      .get('/api/inventory-items/movements?type=disposal&reason=expired')
      .set(asDora())
      .expect(200);
    expect(disposals.body.total).toBe(1);
  });

  // triste
  it('refuses to take out more than the shelf has, saying the number', async () => {
    const created = await registerItem({ name: 'Copo' }).expect(201);

    const fromEmpty = await move(created.body.id, { type: 'out', quantity: 1 }).expect(422);
    expect(fromEmpty.body.message).toContain('Não há Copo no depósito');

    await move(created.body.id, { type: 'in', quantity: 2 }).expect(201);
    const tooMany = await move(created.body.id, { type: 'disposal', quantity: 3, reason: 'lost' })
      .expect(422);
    expect(tooMany.body.message).toContain('Só há 2 de Copo');
  });

  it('refuses a disposal without a reason and a photo that is not an image', async () => {
    const created = await registerItem({}).expect(201);
    await move(created.body.id, { type: 'disposal', quantity: 1 }).expect(400);

    await api()
      .post('/api/inventory-items/photo/upload-url')
      .set(asDora())
      .send({ fileName: 'nota.pdf', contentType: 'application/pdf', sizeBytes: 10 })
      .expect(422);

    /* O arquivo chegou com outro tipo do que o link prometeu: é o tipo medido que vale. */
    const ticket = await api()
      .post('/api/inventory-items/photo/upload-url')
      .set(asDora())
      .send({ fileName: 'foto.png', contentType: 'image/png', sizeBytes: 10 })
      .expect(201);
    await started.storage.put(ticket.body.storageKey, PNG, 'application/pdf');
    await registerItem({ photo: { storageKey: ticket.body.storageKey, fileName: 'foto.png' } })
      .expect(422);
    expect(started.storage.size).toBe(0);
  });

  it('answers 404 for a product that does not exist', async () => {
    await api().get('/api/inventory-items/999999').set(asDora()).expect(404);
    await api().patch('/api/inventory-items/999999').set(asDora()).send({ name: 'x' }).expect(404);
    await api().delete('/api/inventory-items/999999').set(asDora()).expect(404);
    await move(999999, { type: 'in', quantity: 1 }).expect(404);
  });

  it('keeps the role per area: Maintenance readers consult, Infra admins do not enter', async () => {
    const created = await registerItem({}).expect(201);

    await api().get('/api/inventory-items').set(asEdu()).expect(200);
    await registerItem({}, asEdu()).expect(403);
    await move(created.body.id, { type: 'in', quantity: 1 }, asEdu()).expect(403);
    await api().delete(`/api/inventory-items/${created.body.id}`).set(asEdu()).expect(403);

    await api().get('/api/inventory-items').set(asAna()).expect(403);
    await api().get('/api/inventory-items').expect(401);
  });
});
