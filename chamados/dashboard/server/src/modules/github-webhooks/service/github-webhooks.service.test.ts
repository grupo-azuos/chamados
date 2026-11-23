import { createHmac } from 'node:crypto';

import {
  BadRequestException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { type UserDirectoryProvider } from '../../../lib/auth/user-directory.type';
import { type Env } from '../../../lib/config/env.schema';
import { type GithubWebhookEventRow } from '../../../lib/db/schema/github-webhook-events.schema';
import { type GithubConnectionsRepository } from '../../github-integration/repository/github-connections.repository';
import { type SoftwareTimelineRepository } from '../../software-projects/repository/software-timeline.repository';
import { type GithubService } from '../../software-projects/service/github.service';
import { type TicketHistoriesService } from '../../tickets/service/ticket-histories.service';
import { type GithubWebhooksRepository } from '../repository/github-webhooks.repository';
import { GITHUB_WEBHOOK_ACTOR, GithubWebhooksService } from './github-webhooks.service';

const SECRET = 'segredo-do-webhook-de-teste';

const closedIssue = {
  action: 'closed',
  repository: { full_name: 'grupo-azuos/paralegal' },
  sender: { login: 'vinicius-gpl' },
  issue: {
    number: 85,
    title: 'Botão de voltar',
    html_url: 'https://github.com/grupo-azuos/paralegal/issues/85',
    state: 'closed',
    state_reason: 'completed',
    created_at: '2026-11-20T10:00:00Z',
    closed_at: '2026-11-23T15:00:00Z',
    user: { login: 'app-chamados[bot]' },
  },
};

function signed(payload: unknown, secret = SECRET) {
  const rawBody = Buffer.from(JSON.stringify(payload));
  const signature = `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`;
  return { rawBody, signature };
}

function rowOf(event: string, payload: Record<string, unknown>): GithubWebhookEventRow {
  return {
    id: 7,
    deliveryId: 'delivery-1',
    event,
    action: typeof payload.action === 'string' ? payload.action : null,
    repositoryFullName: 'grupo-azuos/paralegal',
    senderLogin: (payload.sender as { login?: string } | undefined)?.login ?? null,
    payload,
    receivedAt: new Date(),
    processedAt: null,
    error: null,
  };
}

function makeService(
  options: { secret?: string; projectId?: number | null; saved?: boolean } = {},
) {
  const repository = {
    save: vi.fn((event: { event: string; payload: Record<string, unknown> }) =>
      Promise.resolve(options.saved === false ? null : rowOf(event.event, event.payload)),
    ),
    markProcessed: vi.fn(() => Promise.resolve()),
    findProjectIdByRepository: vi.fn(() =>
      Promise.resolve(options.projectId === undefined ? 3 : options.projectId),
    ),
    findTicketIdByIssue: vi.fn(() => Promise.resolve(42)),
  };
  const timeline = { upsertMany: vi.fn(() => Promise.resolve(1)) };
  const histories = { recordFromGithub: vi.fn(() => Promise.resolve(null)) };
  const github = { fetchClosingComment: vi.fn(() => Promise.resolve('Corrigido no PR #90.')) };
  const connections = {
    listLogins: vi.fn(() => Promise.resolve([{ userId: 'u-1', login: 'Vinicius-GPL' }])),
  };
  const directory = {
    getUserById: vi.fn(() =>
      Promise.resolve({ id: 'u-1', name: 'Vinícius Gabriel', email: 'vinicius@azuos.com.br' }),
    ),
  };
  const env = {
    GITHUB_APP_WEBHOOK_SECRET: options.secret === undefined ? SECRET : options.secret,
  } as Env;

  const service = new GithubWebhooksService(
    env,
    repository as unknown as GithubWebhooksRepository,
    timeline as unknown as SoftwareTimelineRepository,
    histories as unknown as TicketHistoriesService,
    github as unknown as GithubService,
    connections as unknown as GithubConnectionsRepository,
    directory as unknown as UserDirectoryProvider,
  );

  return { service, repository, timeline, histories, github };
}

describe('GithubWebhooksService.receive', () => {
  // feliz
  it('stores the issue, writes it to the timeline and closes the ticket with the closing comment', async () => {
    const { service, repository, timeline, histories, github } = makeService();
    const { rawBody, signature } = signed(closedIssue);

    const result = await service.receive(
      { deliveryId: 'delivery-1', event: 'issues', signature },
      rawBody,
      closedIssue,
    );

    expect(result).toEqual({ status: 'accepted' });
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        deliveryId: 'delivery-1',
        event: 'issues',
        action: 'closed',
        repositoryFullName: 'grupo-azuos/paralegal',
        senderLogin: 'vinicius-gpl',
      }),
    );
    expect(timeline.upsertMany).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          projectId: 3,
          type: 'issue',
          externalId: '#85',
          status: 'closed',
          author: 'vinicius-gpl',
          authorName: 'Vinícius Gabriel',
          createdBy: GITHUB_WEBHOOK_ACTOR,
        }),
      ],
      { keepCoAuthors: true },
    );
    expect(github.fetchClosingComment).toHaveBeenCalledWith(
      { owner: 'grupo-azuos', repo: 'paralegal' },
      85,
      new Date('2026-11-23T15:00:00Z'),
    );
    expect(histories.recordFromGithub).toHaveBeenCalledWith(
      42,
      {
        action: 'closed',
        stateReason: 'completed',
        issueNumber: 85,
        senderLogin: 'vinicius-gpl',
        closingComment: 'Corrigido no PR #90.',
      },
      { name: 'Vinícius Gabriel', email: 'vinicius@azuos.com.br', id: 'u-1' },
    );
    expect(repository.markProcessed).toHaveBeenCalledWith(7, null);
  });

  // feliz
  it('writes a merged pull request to the timeline right away', async () => {
    const { service, timeline, histories } = makeService();
    const payload = {
      action: 'closed',
      repository: { full_name: 'grupo-azuos/paralegal' },
      sender: { login: 'vinicius-gpl' },
      pull_request: {
        number: 90,
        title: 'feat: botão de voltar',
        html_url: 'https://github.com/grupo-azuos/paralegal/pull/90',
        state: 'closed',
        merged_at: '2026-11-23T14:59:00Z',
        created_at: '2026-11-22T09:00:00Z',
        user: { login: 'vinicius-gpl' },
      },
    };
    const { rawBody, signature } = signed(payload);

    await service.receive(
      { deliveryId: 'd-2', event: 'pull_request', signature },
      rawBody,
      payload,
    );

    expect(timeline.upsertMany).toHaveBeenCalledWith(
      [expect.objectContaining({ type: 'pr', externalId: '#90', status: 'merged' })],
      { keepCoAuthors: true },
    );
    expect(histories.recordFromGithub).not.toHaveBeenCalled();
  });

  // triste
  it('keeps the door closed while the webhook secret is not configured', async () => {
    const { service, repository } = makeService({ secret: '' });
    const { rawBody, signature } = signed(closedIssue);

    await expect(
      service.receive({ deliveryId: 'd', event: 'issues', signature }, rawBody, closedIssue),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  // triste
  it('refuses a notice signed with another secret, before touching the database', async () => {
    const { service, repository } = makeService();
    const { rawBody, signature } = signed(closedIssue, 'segredo-de-um-impostor');

    await expect(
      service.receive({ deliveryId: 'd', event: 'issues', signature }, rawBody, closedIssue),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  // triste
  it('refuses a signed notice without the delivery id', async () => {
    const { service } = makeService();
    const { rawBody, signature } = signed(closedIssue);

    await expect(
      service.receive({ deliveryId: undefined, event: 'issues', signature }, rawBody, closedIssue),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  // triste
  /* O GitHub reenvia quando não recebe resposta a tempo: o mesmo aviso não pode encerrar o
     chamado duas vezes. */
  it('does nothing with a notice GitHub sent again', async () => {
    const { service, histories, timeline } = makeService({ saved: false });
    const { rawBody, signature } = signed(closedIssue);

    const result = await service.receive(
      { deliveryId: 'delivery-1', event: 'issues', signature },
      rawBody,
      closedIssue,
    );

    expect(result).toEqual({ status: 'duplicate' });
    expect(timeline.upsertMany).not.toHaveBeenCalled();
    expect(histories.recordFromGithub).not.toHaveBeenCalled();
  });

  // triste
  it('stores but ignores a notice from a repository with no system registered', async () => {
    const { service, repository, timeline } = makeService({ projectId: null });
    const { rawBody, signature } = signed(closedIssue);

    const result = await service.receive(
      { deliveryId: 'd', event: 'issues', signature },
      rawBody,
      closedIssue,
    );

    expect(result).toEqual({ status: 'ignored' });
    expect(repository.save).toHaveBeenCalled();
    expect(timeline.upsertMany).not.toHaveBeenCalled();
    expect(repository.markProcessed).toHaveBeenCalledWith(7, null);
  });

  // triste
  /* Falhar ao processar não devolve erro ao GitHub — ele só reenviaria o mesmo aviso. O erro
     fica escrito no aviso guardado, para ler depois. */
  it('keeps the error on the stored notice when processing fails', async () => {
    const { service, repository, timeline } = makeService();
    timeline.upsertMany.mockRejectedValueOnce(new Error('banco fora do ar'));
    const { rawBody, signature } = signed(closedIssue);

    const result = await service.receive(
      { deliveryId: 'd', event: 'issues', signature },
      rawBody,
      closedIssue,
    );

    expect(result).toEqual({ status: 'accepted' });
    expect(repository.markProcessed).toHaveBeenCalledWith(
      7,
      expect.stringContaining('banco fora do ar'),
    );
  });

  // triste
  it('records an unlinked GitHub account by its login, without an id', async () => {
    const { service, histories } = makeService();
    const payload = { ...closedIssue, sender: { login: 'alguem-de-fora' } };
    const { rawBody, signature } = signed(payload);

    await service.receive({ deliveryId: 'd', event: 'issues', signature }, rawBody, payload);

    expect(histories.recordFromGithub).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ senderLogin: 'alguem-de-fora' }),
      { name: '@alguem-de-fora (GitHub)', email: 'github:alguem-de-fora' },
    );
  });
});
