import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { asAna, asBia, createE2eApp, type E2eApp } from './support/e2e-app.util';

/**
 * OS EVENTOS DE REDE de ponta a ponta: o registro manual, a porta do UniFi, resolver e
 * reabrir, e o resumo do período — que é SQL com `filter`, e só o Postgres prova.
 *
 * O token do webhook entra pelo ambiente ANTES de a API subir: é assim que a produção o
 * recebe, e é o que faz a porta abrir só para quem o tem.
 *
 * Sem `TEST_DATABASE_URL` a suíte é pulada, e não falha.
 */
const testDatabaseUrl = process.env.TEST_DATABASE_URL;

const WEBHOOK_TOKEN = 'token-do-unifi-de-teste';

describe.skipIf(!testDatabaseUrl)('Network API (e2e)', () => {
  let started: E2eApp;
  let app: INestApplication;

  const api = () => request(app.getHttpServer());

  const registerEvent = (body: Record<string, unknown>, who = asAna()) =>
    api()
      .post('/api/network/events')
      .set(who)
      .send({ type: 'wan_down', title: 'Internet caiu', ...body });

  beforeAll(async () => {
    process.env.UNIFI_WEBHOOK_TOKEN = WEBHOOK_TOKEN;
    started = await createE2eApp(testDatabaseUrl!);
    app = started.app;
  });

  beforeEach(async () => {
    await started.truncate('network_events');
  });

  afterAll(async () => {
    await app.close();
    delete process.env.UNIFI_WEBHOOK_TOKEN;
  });

  // feliz
  it('registers an event by hand, with the default severity of its type', async () => {
    const created = await registerEvent({
      message: '  Caiu às 9h.  ',
      linkName: '',
      occurredAt: '2026-10-20T12:00:00.000Z',
    }).expect(201);

    expect(created.body).toMatchObject({
      type: 'wan_down',
      title: 'Internet caiu',
      message: 'Caiu às 9h.',
      linkName: null,
      source: 'Manual',
      occurredAt: '2026-10-20T12:00:00.000Z',
      resolvedAt: null,
    });
    expect(created.body.severity).toEqual(expect.any(String));
  });

  it('lists the most recent first, with the filters translated to SQL', async () => {
    await registerEvent({ occurredAt: '2026-01-01T12:00:00.000Z' }).expect(201);
    const latency = await registerEvent({
      type: 'high_latency',
      title: 'Latência alta',
      severity: 'attention',
    }).expect(201);
    await registerEvent({ type: 'wan_up', title: 'Voltou', severity: 'info' }).expect(201);

    await api()
      .patch(`/api/network/events/${latency.body.id}/resolution`)
      .set(asAna())
      .send({ isResolved: true })
      .expect(200);

    const all = await api().get('/api/network/events').set(asBia()).expect(200);
    expect(all.body.total).toBe(3);
    expect(all.body.items[0].title).toBe('Voltou');

    const open = await api().get('/api/network/events?onlyOpen=true').set(asAna()).expect(200);
    expect(open.body.total).toBe(2);

    const byType = await api()
      .get('/api/network/events?type=high_latency&severity=attention')
      .set(asAna())
      .expect(200);
    expect(byType.body.items).toHaveLength(1);

    const recent = await api().get('/api/network/events?days=7').set(asAna()).expect(200);
    expect(recent.body.total).toBe(2);
  });

  it('resolves and reopens without erasing the event', async () => {
    const created = await registerEvent({}).expect(201);

    const resolved = await api()
      .patch(`/api/network/events/${created.body.id}/resolution`)
      .set(asAna())
      .send({ isResolved: true })
      .expect(200);
    expect(resolved.body.resolvedBy).toBe('ana@empresa.com.br');
    expect(resolved.body.resolvedAt).toEqual(expect.any(String));

    const reopened = await api()
      .patch(`/api/network/events/${created.body.id}/resolution`)
      .set(asAna())
      .send({ isResolved: false })
      .expect(200);
    expect(reopened.body).toMatchObject({ resolvedAt: null, resolvedBy: null });
  });

  it('summarizes the period: open, outages, time offline and worst numbers', async () => {
    const outage = await registerEvent({}).expect(201);
    await api()
      .patch(`/api/network/events/${outage.body.id}/resolution`)
      .set(asAna())
      .send({ isResolved: true })
      .expect(200);
    await registerEvent({ type: 'packet_loss', title: 'Perda de pacotes' }).expect(201);
    await api()
      .post(`/api/network/webhook?token=${WEBHOOK_TOKEN}`)
      .send({ type: 'high_latency', latencyMs: 250, packetLossPercent: 12.5 })
      .expect(201);

    const summary = await api().get('/api/network/summary?days=30').set(asBia()).expect(200);
    expect(summary.body).toMatchObject({
      days: 30,
      open: 2,
      outages: 1,
      worstLatencyMs: 250,
      worstPacketLossPercent: 12.5,
    });
    expect(summary.body.totalOutageSeconds).toEqual(expect.any(Number));

    const empty = await api().get('/api/network/summary?days=1').set(asAna()).expect(200);
    expect(empty.body.outages).toBe(1);

    const defaulted = await api().get('/api/network/summary').set(asAna()).expect(200);
    expect(defaulted.body.days).toEqual(expect.any(Number));
  });

  it('opens the UniFi door for whoever has the token, classifying the alert', async () => {
    const created = await api()
      .post(`/api/network/webhook?token=${WEBHOOK_TOKEN}`)
      .send({
        alert: 'WAN Down',
        text: 'The WAN link went down.',
        wan: 'WAN1',
        provider: 'Vivo',
        latencyMs: '120',
        extra: { raw: true },
      })
      .expect(201);

    expect(created.body).toMatchObject({
      title: 'WAN Down',
      source: 'UniFi',
      linkName: 'WAN1',
      provider: 'Vivo',
      latencyMs: 120,
    });
    expect(created.body.type).toEqual(expect.any(String));

    const typed = await api()
      .post(`/api/network/webhook?token=${WEBHOOK_TOKEN}`)
      .send({ type: 'failover', severity: 'critical' })
      .expect(201);
    expect(typed.body).toMatchObject({ type: 'failover', title: 'Aviso do UniFi' });
  });

  // triste
  it('keeps the UniFi door closed without the token', async () => {
    await api().post('/api/network/webhook').send({ alert: 'x' }).expect(401);
    await api().post('/api/network/webhook?token=errado').send({ alert: 'x' }).expect(401);
  });

  it('answers 404 for a missing event and refuses a body outside the contract', async () => {
    await api()
      .patch('/api/network/events/999999/resolution')
      .set(asAna())
      .send({ isResolved: true })
      .expect(404);
    await registerEvent({ type: 'tsunami' }).expect(400);
    await registerEvent({ title: '' }).expect(400);
    await api().get('/api/network/events?days=0').set(asAna()).expect(400);
  });

  it('lets who only consults read, and refuses them to write', async () => {
    const created = await registerEvent({}).expect(201);

    await api().get('/api/network/summary').set(asBia()).expect(200);
    await registerEvent({}, asBia()).expect(403);
    await api()
      .patch(`/api/network/events/${created.body.id}/resolution`)
      .set(asBia())
      .send({ isResolved: true })
      .expect(403);
    await api().get('/api/network/events').expect(401);
  });
});
