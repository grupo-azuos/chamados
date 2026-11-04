import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { asAna, asDora, asEdu, createE2eApp, type E2eApp } from './support/e2e-app.util';

/**
 * Os ORÇAMENTOS DA MANUTENÇÃO de ponta a ponta: guardar com o documento, corrigir, aprovar e
 * excluir — e o documento sair do bucket junto.
 *
 * O storage é o de memória: o teste faz o papel do navegador (pede o link, põe o arquivo) e a
 * API confere, move e apaga de verdade.
 *
 * Sem `TEST_DATABASE_URL` a suíte é pulada, e não falha.
 */
const testDatabaseUrl = process.env.TEST_DATABASE_URL;

const PDF = Buffer.from('%PDF-1.4\n%fake\n');

describe.skipIf(!testDatabaseUrl)('Maintenance quotes API (e2e)', () => {
  let started: E2eApp;
  let app: INestApplication;

  const api = () => request(app.getHttpServer());

  const sendDocument = async (fileName = 'orcamento.pdf', contentType = 'application/pdf') => {
    const ticket = await api()
      .post('/api/v1/maintenance-quotes/attachment/upload-url')
      .set(asDora())
      .send({ fileName, contentType, sizeBytes: PDF.length })
      .expect(201);
    await started.storage.put(ticket.body.storageKey, PDF, contentType);

    return { storageKey: ticket.body.storageKey as string, fileName };
  };

  const registerQuote = (body: Record<string, unknown>, who = asDora()) =>
    api()
      .post('/api/v1/maintenance-quotes')
      .set(who)
      .send({
        supplier: 'Refrigeração Silva',
        description: 'Troca do compressor do ar-condicionado',
        kind: 'service',
        amountCents: 125_000,
        quotedOn: '2026-10-20',
        ...body,
      });

  beforeAll(async () => {
    started = await createE2eApp(testDatabaseUrl!);
    app = started.app;
  });

  beforeEach(async () => {
    await started.truncate('maintenance_quotes');
    await started.storage.remove(
      (await started.storage.list('', 10_000, () => true)).map((file) => file.key),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  // feliz
  it('stores the quote with its document and the author from the identity', async () => {
    const created = await registerQuote({
      attachment: await sendDocument(),
      note: '',
      createdBy: 'ana@empresa.com.br',
    }).expect(201);

    expect(created.body).toMatchObject({
      supplier: 'Refrigeração Silva',
      kind: 'service',
      amountCents: 125_000,
      quotedOn: '2026-10-20',
      status: 'pending',
      note: null,
      attachmentName: 'orcamento.pdf',
      createdBy: 'dora@empresa.com.br',
    });
    expect(created.body.attachmentUrl).toEqual(expect.any(String));
    expect(started.storage.size).toBe(1);
  });

  it('lists the most recent first, filtered in the query', async () => {
    await registerQuote({ supplier: 'Elétrica Souza', quotedOn: '2026-09-01', kind: 'product' })
      .expect(201);
    await registerQuote({ quotedOn: '2026-10-20', status: 'approved' }).expect(201);
    await registerQuote({ description: 'Pintura da fachada', quotedOn: '2026-10-05' }).expect(201);

    const all = await api().get('/api/v1/maintenance-quotes').set(asEdu()).expect(200);
    expect(all.body.items.map((quote: { quotedOn: string }) => quote.quotedOn)).toEqual([
      '2026-10-20',
      '2026-10-05',
      '2026-09-01',
    ]);

    const approved = await api()
      .get('/api/v1/maintenance-quotes?status=approved')
      .set(asDora())
      .expect(200);
    expect(approved.body.total).toBe(1);

    const products = await api().get('/api/v1/maintenance-quotes?kind=product').set(asDora()).expect(200);
    expect(products.body.items[0].supplier).toBe('Elétrica Souza');

    const search = await api()
      .get('/api/v1/maintenance-quotes?search=fachada')
      .set(asDora())
      .expect(200);
    expect(search.body.total).toBe(1);

    const paged = await api()
      .get('/api/v1/maintenance-quotes?page=2&pageSize=2')
      .set(asDora())
      .expect(200);
    expect(paged.body.items).toHaveLength(1);
  });

  it('corrects the quote, replaces and removes the document', async () => {
    const created = await registerQuote({ attachment: await sendDocument('v1.pdf') }).expect(201);

    const approved = await api()
      .patch(`/api/v1/maintenance-quotes/${created.body.id}`)
      .set(asDora())
      .send({ status: 'approved', amountCents: 119_900, attachment: await sendDocument('v2.pdf') })
      .expect(200);
    expect(approved.body).toMatchObject({
      status: 'approved',
      amountCents: 119_900,
      attachmentName: 'v2.pdf',
      updatedBy: 'dora@empresa.com.br',
    });
    expect(started.storage.size).toBe(1);

    const stripped = await api()
      .patch(`/api/v1/maintenance-quotes/${created.body.id}`)
      .set(asDora())
      .send({ removeAttachment: true })
      .expect(200);
    expect(stripped.body.attachmentUrl).toBeNull();
    expect(stripped.body.attachmentName).toBeNull();
    expect(started.storage.size).toBe(0);

    const found = await api()
      .get(`/api/v1/maintenance-quotes/${created.body.id}`)
      .set(asEdu())
      .expect(200);
    expect(found.body.status).toBe('approved');
  });

  it('deletes the quote together with its document', async () => {
    const created = await registerQuote({ attachment: await sendDocument() }).expect(201);

    await api().delete(`/api/v1/maintenance-quotes/${created.body.id}`).set(asDora()).expect(204);

    expect(started.storage.size).toBe(0);
    await api().get(`/api/v1/maintenance-quotes/${created.body.id}`).set(asDora()).expect(404);
  });

  // triste
  it('refuses a document that is not a PDF or an image', async () => {
    await api()
      .post('/api/v1/maintenance-quotes/attachment/upload-url')
      .set(asDora())
      .send({ fileName: 'planilha.xlsx', contentType: 'application/vnd.ms-excel', sizeBytes: 10 })
      .expect(422);

    /* O arquivo chegou com outro tipo do que o link prometeu: é o tipo medido que vale. */
    const ticket = await api()
      .post('/api/v1/maintenance-quotes/attachment/upload-url')
      .set(asDora())
      .send({ fileName: 'orcamento.pdf', contentType: 'application/pdf', sizeBytes: 10 })
      .expect(201);
    await started.storage.put(ticket.body.storageKey, PDF, 'application/zip');
    await registerQuote({
      attachment: { storageKey: ticket.body.storageKey, fileName: 'orcamento.pdf' },
    }).expect(422);
    expect(started.storage.size).toBe(0);
  });

  it('refuses a body outside the contract and answers 404 for a missing quote', async () => {
    await registerQuote({ quotedOn: '20/10/2026' }).expect(400);
    await registerQuote({ amountCents: -1 }).expect(400);

    await api().get('/api/v1/maintenance-quotes/999999').set(asDora()).expect(404);
    await api()
      .patch('/api/v1/maintenance-quotes/999999')
      .set(asDora())
      .send({ status: 'rejected' })
      .expect(404);
    await api().delete('/api/v1/maintenance-quotes/999999').set(asDora()).expect(404);
  });

  it('keeps the role per area: readers consult, Infra admins do not enter', async () => {
    const created = await registerQuote({}).expect(201);

    await api().get('/api/v1/maintenance-quotes').set(asEdu()).expect(200);
    await registerQuote({}, asEdu()).expect(403);
    await api()
      .patch(`/api/v1/maintenance-quotes/${created.body.id}`)
      .set(asEdu())
      .send({ status: 'approved' })
      .expect(403);
    await api().delete(`/api/v1/maintenance-quotes/${created.body.id}`).set(asEdu()).expect(403);

    await api().get('/api/v1/maintenance-quotes').set(asAna()).expect(403);
    await api().get('/api/v1/maintenance-quotes').expect(401);
  });
});
