import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { asAna, asDora, asEdu, createE2eApp, type E2eApp } from './support/e2e-app.util';

/**
 * O PAINEL DA MANUTENÇÃO: o inventário, os orçamentos e os descartes do mês, somados pelo
 * Postgres com `count(*) filter` e `coalesce(sum(...))` — zero quando não há nada, e não nulo.
 *
 * Sem `TEST_DATABASE_URL` a suíte é pulada, e não falha.
 */
const testDatabaseUrl = process.env.TEST_DATABASE_URL;

describe.skipIf(!testDatabaseUrl)('Maintenance dashboard API (e2e)', () => {
  let started: E2eApp;
  let app: INestApplication;

  const api = () => request(app.getHttpServer());

  const registerItem = async (name: string): Promise<number> => {
    const created = await api()
      .post('/api/v1/inventory-items')
      .set(asDora())
      .send({ name, category: 'pantry', unit: 'package' })
      .expect(201);

    return created.body.id;
  };

  const registerQuote = (status: string, amountCents: number) =>
    api()
      .post('/api/v1/maintenance-quotes')
      .set(asDora())
      .send({
        supplier: 'Fornecedor',
        description: 'Orçamento',
        kind: 'product',
        amountCents,
        quotedOn: '2026-10-20',
        status,
      })
      .expect(201);

  beforeAll(async () => {
    started = await createE2eApp(testDatabaseUrl!);
    app = started.app;
  });

  beforeEach(async () => {
    await started.truncate('inventory_movements', 'inventory_items', 'maintenance_quotes');
  });

  afterAll(async () => {
    await app.close();
  });

  // feliz
  it('answers zeroed when there is nothing yet', async () => {
    const summary = await api().get('/api/v1/maintenance-dashboard').set(asEdu()).expect(200);

    expect(summary.body).toMatchObject({
      inventory: { products: 0, outOfStock: 0 },
      quotes: { pending: 0, pendingAmountCents: 0, approvedAmountCents: 0 },
      recentMovements: [],
    });
    expect(summary.body.disposals.units).toBe(0);
  });

  it('adds up the shelf, the quotes and the disposals', async () => {
    const coffee = await registerItem('Café');
    await registerItem('Açúcar');
    await api()
      .post(`/api/v1/inventory-items/${coffee}/movements`)
      .set(asDora())
      .send({ type: 'in', quantity: 5 })
      .expect(201);
    await api()
      .post(`/api/v1/inventory-items/${coffee}/movements`)
      .set(asDora())
      .send({ type: 'disposal', quantity: 2, reason: 'expired' })
      .expect(201);

    await registerQuote('pending', 10_000);
    await registerQuote('pending', 5_000);
    const approved = await registerQuote('pending', 70_000);
    await api()
      .patch(`/api/v1/maintenance-quotes/${approved.body.id}`)
      .set(asDora())
      .send({ status: 'approved' })
      .expect(200);
    await registerQuote('rejected', 1_000);

    const summary = await api().get('/api/v1/maintenance-dashboard').set(asDora()).expect(200);

    expect(summary.body.inventory).toEqual({ products: 2, outOfStock: 1 });
    expect(summary.body.quotes).toMatchObject({
      pending: 2,
      pendingAmountCents: 15_000,
      approvedAmountCents: 70_000,
    });
    expect(summary.body.disposals.units).toBe(2);
    expect(summary.body.recentMovements).toHaveLength(2);
  });

  // triste
  it('keeps the panel for the Maintenance module only', async () => {
    await api().get('/api/v1/maintenance-dashboard').set(asAna()).expect(403);
    await api().get('/api/v1/maintenance-dashboard').expect(401);
  });
});
