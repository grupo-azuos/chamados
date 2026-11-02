import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { GithubConnectionsRepository } from '../src/modules/github-integration/repository/github-connections.repository';
import { WhatsappInboundMessagesRepository } from '../src/modules/whatsapp-intake/repository/whatsapp-inbound-messages.repository';
import { WhatsappConversationsRepository } from '../src/modules/whatsapp-intake/repository/whatsapp-conversations.repository';
import { WhatsappConnectionsRepository } from '../src/modules/whatsapp/repository/whatsapp-connections.repository';
import { WhatsappMessagesRepository } from '../src/modules/whatsapp/repository/whatsapp-messages.repository';
import { WhatsappTemplatesRepository } from '../src/modules/whatsapp/repository/whatsapp-templates.repository';
import { createE2eApp, type E2eApp } from './support/e2e-app.util';

/**
 * Os REPOSITÓRIOS das integrações (GitHub e WhatsApp), contra o Postgres de verdade.
 *
 * Nenhum deles fala com a rede — são só a memória das integrações: o vínculo de cada pessoa,
 * o estado do OAuth que se consome uma vez só, a fila de avisos e a conversa do bot. O que só
 * quebra aqui: o `on conflict`, o `delete ... returning` que consome o estado, o `distinct on`
 * da fila (uma mensagem por remetente por rodada) e a faxina do que venceu.
 *
 * Sem `TEST_DATABASE_URL` a suíte é pulada, e não falha.
 */
const testDatabaseUrl = process.env.TEST_DATABASE_URL;

/* Relógio de verdade: o estado do OAuth e a fila vencem contra o `now()` do banco e do serviço. */
const NOW = new Date();
const IN_ONE_HOUR = new Date(NOW.getTime() + 3_600_000);
const ONE_HOUR_AGO = new Date(NOW.getTime() - 3_600_000);

describe.skipIf(!testDatabaseUrl)('Integration repositories (e2e)', () => {
  let started: E2eApp;

  beforeAll(async () => {
    started = await createE2eApp(testDatabaseUrl!);
  });

  beforeEach(async () => {
    await started.truncate(
      'github_connections',
      'github_oauth_states',
      'whatsapp_messages',
      'whatsapp_connections',
      'whatsapp_templates',
      'whatsapp_conversations',
      'whatsapp_inbound_messages',
    );
  });

  afterAll(async () => {
    await started.app.close();
  });

  describe('GithubConnectionsRepository', () => {
    // feliz
    it('saves the link once per person, lists the logins and removes it', async () => {
      const repository = new GithubConnectionsRepository(started.db);

      await repository.save({ userId: 'u1', githubId: '1', login: 'ana-gh', accessToken: 't1' });
      await repository.save({ userId: 'u1', githubId: '1', login: 'ana-nova', accessToken: 't2' });
      await repository.save({ userId: 'u2', githubId: '2', login: 'caio-gh', accessToken: 't3' });

      expect(await repository.find('u1')).toMatchObject({ login: 'ana-nova', accessToken: 't2' });
      expect(await repository.listLogins()).toEqual(
        expect.arrayContaining([
          { userId: 'u1', login: 'ana-nova' },
          { userId: 'u2', login: 'caio-gh' },
        ]),
      );

      await repository.remove('u1');
      expect(await repository.find('u1')).toBeNull();
    });

    it('consumes the OAuth state only once, and only from the same browser', async () => {
      const repository = new GithubConnectionsRepository(started.db);
      const state = { userId: 'u1', browserHash: 'b1', codeVerifier: 'v1', expiresAt: IN_ONE_HOUR };

      await repository.createState({ stateHash: 's1', ...state });

      expect(await repository.consumeState('s1', 'outro-navegador')).toBeNull();
      expect(await repository.consumeState('s1', 'b1')).toMatchObject({ codeVerifier: 'v1' });
      expect(await repository.consumeState('s1', 'b1')).toBeNull();
    });

    // triste
    it('sweeps the expired states when a new one is created, and refuses to consume them', async () => {
      const repository = new GithubConnectionsRepository(started.db);

      await repository.createState({
        stateHash: 'velho',
        userId: 'u1',
        browserHash: 'b1',
        codeVerifier: 'v',
        expiresAt: ONE_HOUR_AGO,
      });
      expect(await repository.consumeState('velho', 'b1')).toBeNull();

      await repository.createState({
        stateHash: 'novo',
        userId: 'u1',
        browserHash: 'b1',
        codeVerifier: 'v',
        expiresAt: IN_ONE_HOUR,
      });
      expect(await repository.consumeState('novo', 'b1')).not.toBeNull();
    });
  });

  describe('WhatsappConnectionsRepository', () => {
    // feliz
    it('links a number per person, replacing the previous one', async () => {
      const repository = new WhatsappConnectionsRepository(started.db);

      await repository.save('u1', '5511999990000', 'Ana');
      await repository.save('u1', '5511999991111');
      await repository.save('u2', '5511999992222', 'Caio');

      expect(await repository.find('u1')).toMatchObject({ phone: '5511999991111', operatorName: null });
      expect(await repository.list()).toHaveLength(2);

      await repository.remove('u1');
      expect(await repository.find('u1')).toBeNull();
    });
  });

  describe('WhatsappTemplatesRepository', () => {
    // feliz
    it('saves a text per key, lists and restores the default by removing it', async () => {
      const repository = new WhatsappTemplatesRepository(started.db);

      await repository.save('ticket_ready', 'Seu chamado está pronto.', 'olga@empresa.com.br');
      await repository.save('ticket_ready', 'Pronto!', 'olga@empresa.com.br');

      expect(await repository.find('ticket_ready')).toMatchObject({ body: 'Pronto!' });
      expect(await repository.list()).toHaveLength(1);

      await repository.remove('ticket_ready');
      expect(await repository.find('ticket_ready')).toBeNull();
    });
  });

  describe('WhatsappMessagesRepository', () => {
    // feliz
    it('counts only what was sent since the date, by sender', async () => {
      const repository = new WhatsappMessagesRepository(started.db);
      const message = { senderUserId: 'u1', ticketId: 1, kind: 'ticket_ready', recipient: '55' };

      await repository.record(message, NOW);
      await repository.record(message, ONE_HOUR_AGO);
      await repository.record({ ...message, senderUserId: 'u2' }, NOW);
      await repository.enqueue({ ...message, body: 'Oi', expiresAt: IN_ONE_HOUR }, NOW);

      expect(await repository.countSince('u1', new Date(NOW.getTime() - 60_000))).toBe(1);
      expect(await repository.countSince('u1', new Date(0))).toBe(2);
    });

    it('claims one due message per sender per round, leasing it until the next attempt', async () => {
      const repository = new WhatsappMessagesRepository(started.db);
      const queued = (senderUserId: string) => ({
        senderUserId,
        ticketId: 1,
        kind: 'ticket_update',
        recipient: '55',
        body: 'Oi',
        expiresAt: IN_ONE_HOUR,
      });

      await repository.enqueue(queued('u1'), ONE_HOUR_AGO);
      await repository.enqueue(queued('u1'), ONE_HOUR_AGO);
      await repository.enqueue(queued('u2'), ONE_HOUR_AGO);
      await repository.enqueue(queued('u3'), IN_ONE_HOUR);

      const claimed = await repository.claimDue(NOW, IN_ONE_HOUR, 10);
      expect(claimed.map((row) => row.senderUserId).sort()).toEqual(['u1', 'u2']);
      expect(claimed[0]?.attempts).toBe(1);

      /* Já emprestadas: a próxima rodada antes do fim do empréstimo não as pega de novo. */
      expect(await repository.claimDue(NOW, IN_ONE_HOUR, 10)).toHaveLength(1);
    });

    it('marks as sent erasing the text, reschedules, stops and requeues', async () => {
      const repository = new WhatsappMessagesRepository(started.db);
      const message = {
        senderUserId: 'u1',
        ticketId: 7,
        kind: 'ticket_opened',
        recipient: '55',
        body: 'Chamado aberto.',
        expiresAt: IN_ONE_HOUR,
      };

      await repository.enqueue(message, ONE_HOUR_AGO);
      await repository.enqueue({ ...message, kind: 'intake_link' }, ONE_HOUR_AGO);
      const [first] = await repository.listForTicket(7);
      expect(first).toMatchObject({ kind: 'ticket_opened', status: 'pending' });
      expect(await repository.listForTicket(7)).toHaveLength(1);

      await repository.reschedule(first!.id, IN_ONE_HOUR, 'not_connected', IN_ONE_HOUR);
      let [row] = await repository.listForTicket(7);
      expect(row).toMatchObject({ failureReason: 'not_connected', status: 'pending' });

      await repository.stop(first!.id, 'failed', 'expired');
      [row] = await repository.listForTicket(7);
      expect(row).toMatchObject({ status: 'failed', failureReason: 'expired', nextAttemptAt: null });

      const requeued = await repository.requeue(7, first!.id, NOW, IN_ONE_HOUR);
      expect(requeued).toMatchObject({ status: 'pending', attempts: 0, failureReason: null });

      await repository.markSent(first!.id, NOW);
      [row] = await repository.listForTicket(7);
      expect(row).toMatchObject({ status: 'sent', body: null, nextAttemptAt: null });
    });

    // triste
    it('does not requeue what was sent, nor a notice of another ticket', async () => {
      const repository = new WhatsappMessagesRepository(started.db);

      await repository.record(
        { senderUserId: 'u1', ticketId: 7, kind: 'ticket_ready', recipient: '55' },
        NOW,
      );
      const [sent] = await repository.listForTicket(7);

      expect(await repository.requeue(7, sent!.id, NOW, IN_ONE_HOUR)).toBeNull();
      expect(await repository.requeue(8, sent!.id, NOW, IN_ONE_HOUR)).toBeNull();
    });
  });

  describe('WhatsappConversationsRepository', () => {
    // feliz
    it('keeps one conversation per key, replacing the draft', async () => {
      const repository = new WhatsappConversationsRepository(started.db);
      const draft = {
        requesterName: 'Marta',
        email: null,
        phone: '5511999990000',
        department: null,
      };

      await repository.save(
        { key: 'c1', userId: 'u1', attendantName: 'Ana', draft, expiresAt: IN_ONE_HOUR },
        NOW,
      );
      await repository.save(
        {
          key: 'c1',
          userId: 'u1',
          attendantName: 'Ana',
          draft: { ...draft, email: 'marta@empresa.com.br' },
          expiresAt: IN_ONE_HOUR,
        },
        NOW,
      );

      const found = await repository.find('c1');
      expect(found?.draft).toMatchObject({ email: 'marta@empresa.com.br' });

      await repository.remove('c1');
      expect(await repository.find('c1')).toBeNull();
    });
  });

  describe('WhatsappInboundMessagesRepository', () => {
    // feliz
    it('claims a message once per session, and forgets the old ones', async () => {
      const repository = new WhatsappInboundMessagesRepository(started.db);
      const twoDaysAgo = new Date(NOW.getTime() - 2 * 24 * 3_600_000);

      expect(await repository.claim('s1', 'm1', twoDaysAgo)).toBe(true);
      expect(await repository.claim('s1', 'm1', twoDaysAgo)).toBe(false);
      expect(await repository.claim('s2', 'm1', twoDaysAgo)).toBe(true);

      /* A faxina apagou as de dois dias atrás: a mesma mensagem volta a ser nova. */
      expect(await repository.claim('s1', 'm2', NOW)).toBe(true);
      expect(await repository.claim('s1', 'm1', NOW)).toBe(true);
    });
  });
});
