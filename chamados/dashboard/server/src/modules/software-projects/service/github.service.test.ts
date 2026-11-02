import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type Database } from '../../../lib/db/db.type';
import {
  CHAMADOS_BOT_NAME,
  coAuthorsOfCommits,
  coAuthorTrailersOf,
  GithubService,
} from './github.service';
import type { GithubAppService } from '../../github-integration/service/github-app.service';

describe('GithubService', () => {
  it('syncs PRs from multiple developers using the organization token', async () => {
    const app = { accessToken: vi.fn().mockResolvedValue('installation-token') };
    const service = new GithubService({} as Database, app as unknown as GithubAppService);
    const fetcher = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify(
          ['dev-a', 'dev-b'].map((login, index) => ({
            number: index + 1,
            title: login,
            html_url: `https://github.com/org/repo/pull/${index + 1}`,
            user: { login },
            state: 'open',
            created_at: '2026-10-01T12:00:00Z',
          })),
        ),
      ),
    );
    const result = await service.fetchPullRequests('org', 'repo', 'admin-local-id');
    expect(result.map((pr) => pr.author)).toEqual(['dev-a', 'dev-b']);
    expect(fetcher.mock.calls[0]?.[1]?.headers).toMatchObject({
      Authorization: 'Bearer installation-token',
    });
  });
  // feliz
  it('asks only for issues changed since the date when one is given', async () => {
    const service = new GithubService({} as Database);
    const fetcher = vi.spyOn(global, 'fetch').mockResolvedValue(new Response('[]'));

    await service.fetchIssues('org', 'repo', undefined, new Date('2026-10-16T03:00:00Z'));

    expect(String(fetcher.mock.calls[0]?.[0])).toContain('since=2026-10-16T03%3A00%3A00.000Z');
  });

  // feliz
  it('stops paging pull requests once they are older than the date', async () => {
    const service = new GithubService({} as Database);
    const pr = (number: number, updatedAt: string) => ({
      number,
      title: `PR ${number}`,
      html_url: `https://github.com/org/repo/pull/${number}`,
      user: { login: 'dev' },
      state: 'closed',
      merged_at: updatedAt,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: updatedAt,
    });
    const fetcher = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify([pr(2, '2026-10-17T10:00:00Z'), pr(1, '2026-10-01T10:00:00Z')]), {
        headers: { link: '<https://api.github.com/x?page=2>; rel="next"' },
      }),
    );

    const result = await service.fetchPullRequests(
      'org',
      'repo',
      undefined,
      new Date('2026-10-16T03:00:00Z'),
    );

    expect(result.map((item) => item.externalId)).toEqual(['#2']);
    /* Só as páginas da LISTA de PRs: a leitura dos commits do PR mergeado (co-autores) é à parte. */
    expect(fetcher.mock.calls.filter(([url]) => String(url).includes('/pulls?'))).toHaveLength(1);
    expect(String(fetcher.mock.calls[0]?.[0])).toContain('sort=updated&direction=desc');
  });

  // feliz
  it('names the issues our own App opened as the Chamados bot, and keeps other bots as they are', async () => {
    const app = { accessToken: vi.fn().mockResolvedValue('t'), appId: 42 };
    const service = new GithubService({} as Database, app as unknown as GithubAppService);
    const issue = (number: number, login: string, appId: number | null, state = 'open') => ({
      number,
      title: `Issue ${number}`,
      html_url: `https://github.com/org/repo/issues/${number}`,
      user: { login },
      state,
      created_at: '2026-10-16T12:00:00Z',
      closed_at: state === 'closed' ? '2026-10-17T12:00:00Z' : null,
      closed_by: state === 'closed' ? { login: number === 30 ? 'app-chamados[bot]' : 'vinicius-gpl' } : null,
      performed_via_github_app: appId ? { id: appId } : null,
    });
    vi.spyOn(global, 'fetch').mockImplementation(async (url) =>
      String(url).includes('/users/')
        ? new Response(JSON.stringify({ name: null }))
        : new Response(
            JSON.stringify([
              issue(27, 'app-chamados[bot]', 42),
              issue(28, 'dependabot[bot]', 7),
              issue(29, 'app-chamados[bot]', 42, 'closed'),
              issue(30, 'vinicius-gpl', null, 'closed'),
            ]),
          ),
    );

    const result = await service.fetchIssues('org', 'repo');

    expect(result.map((item) => [item.externalId, item.author, item.authorName])).toEqual([
      ['#27', 'app-chamados[bot]', 'GitHub Chamados Bot'],
      ['#28', 'dependabot[bot]', 'dependabot[bot]'],
      /* Fechada: o autor é quem fechou, uma pessoa — não o bot que abriu. */
      ['#29', 'vinicius-gpl', 'vinicius-gpl'],
      /* Fechada pelo nosso App (o chamado foi encerrado): aparece como o bot, nunca como
         `app-chamados[bot]` resolvendo issue. */
      ['#30', 'app-chamados[bot]', 'GitHub Chamados Bot'],
    ]);
  });

  it('excludes pull requests returned by the issues endpoint', async () => {
    const service = new GithubService({} as Database);
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            number: 1,
            title: 'Issue',
            html_url: 'https://github.com/org/repo/issues/1',
            user: { login: 'dev' },
            state: 'open',
            created_at: '2026-10-01T12:00:00Z',
          },
          { number: 2, pull_request: {}, title: 'PR' },
        ]),
      ),
    );
    expect(await service.fetchIssues('org', 'repo')).toMatchObject([
      {
        externalId: '#1',
        title: 'Issue',
        author: 'dev',
        status: 'open',
        eventDate: new Date('2026-10-01T12:00:00Z'),
      },
    ]);
  });

  // feliz
  it('returns only develop merge commits that have no associated pull request', async () => {
    const service = new GithubService({} as Database);
    vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
      if (String(url).endsWith('/pulls'))
        return new Response(String(url).includes('def123456789')
            ? '[{"number":4,"merge_commit_sha":"def123456789"}]'
            : '[]',
        );
      if (String(url).includes('/users/')) return new Response(JSON.stringify({ name: 'Dev' }));
      return new Response(
        JSON.stringify([
          {
            sha: 'abc123456789',
            html_url: 'https://github.com/org/repo/commit/abc123456789',
            commit: { message: 'Merge feature local', committer: { date: '2026-10-16T12:00:00Z' } },
            author: { login: 'dev' },
            parents: [{ sha: 'one' }, { sha: 'two' }],
          },
          {
            sha: 'def123456789',
            html_url: 'https://github.com/org/repo/commit/def123456789',
            commit: { message: 'Merge pull request #4', committer: { date: '2026-10-16T13:00:00Z' } },
            author: { login: 'dev' },
            parents: [{ sha: 'three' }, { sha: 'four' }],
          },
          {
            sha: 'ghi123456789',
            html_url: 'https://github.com/org/repo/commit/ghi123456789',
            commit: { message: 'regular commit' },
            parents: [{ sha: 'five' }],
          },
        ]),
      );
    });

    await expect(service.fetchLocalMerges('org', 'repo')).resolves.toMatchObject([
      { externalId: 'abc1234', title: 'Merge feature local', author: 'dev', status: 'merged' },
    ]);
    expect(String(vi.mocked(fetch).mock.calls[0]?.[0])).toContain('sha=develop');
  });

  // triste
  /* Um PR aberto da develop para a main CONTÉM todos os merges locais; não é o PR deles. Antes,
     só por estar nele, o merge sumia — e com ele dias inteiros de trabalho no cronograma. */
  it('keeps a local merge that is only contained in an open pull request', async () => {
    const service = new GithubService({} as Database);
    vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
      if (String(url).endsWith('/pulls'))
        return new Response('[{"number":18,"state":"open","merge_commit_sha":"other-sha"}]');
      if (String(url).includes('/users/')) return new Response(JSON.stringify({ name: 'Dev' }));
      return new Response(
        JSON.stringify([
          {
            sha: 'abc123456789',
            html_url: 'https://github.com/org/repo/commit/abc123456789',
            commit: { message: 'Merge feature local', committer: { date: '2026-10-20T12:00:00Z' } },
            author: { login: 'dev' },
            parents: [{ sha: 'one' }, { sha: 'two' }],
          },
        ]),
      );
    });

    await expect(service.fetchLocalMerges('org', 'repo')).resolves.toMatchObject([
      { externalId: 'abc1234', author: 'dev', status: 'merged' },
    ]);
  });

  it('attributes resolved issues to the closer and uses the close date', async () => {
    const service = new GithubService({} as Database);
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          {
            number: 3,
            title: 'Issue resolvida',
            html_url: 'https://github.com/org/repo/issues/3',
            user: { login: 'reporter' },
            state: 'closed',
            created_at: '2026-10-01T12:00:00Z',
            closed_at: '2026-10-05T15:30:00Z',
            closed_by: { login: 'resolver' },
          },
        ]),
      ),
    );

    await expect(service.fetchIssues('org', 'repo')).resolves.toMatchObject([
      {
        externalId: '#3',
        author: 'resolver',
        status: 'closed',
        eventDate: new Date('2026-10-05T15:30:00Z'),
      },
    ]);
  });
  const originalEnv = process.env.GITHUB_TOKEN;
  let mockDb: unknown;

  beforeEach(() => {
    /* Chamada que o teste não simulou (ex.: o nome do autor) falha na hora, em vez de sair para
       a internet: na CI o GitHub respondia rápido e o teste passava; sem rede, ele estourava o tempo. */
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('unexpected network call'));
    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockResolvedValue([]),
    };
  });

  afterEach(() => {
    process.env.GITHUB_TOKEN = originalEnv;
    vi.restoreAllMocks();
  });

  it('fetchPullRequests returns parsed PR list on successful response', async () => {
    const service = new GithubService(mockDb as Database);

    const mockPrs = [
      {
        number: 42,
        title: 'feat: Test PR',
        html_url: 'https://github.com/owner/repo/pull/42',
        user: { login: 'dev' },
        state: 'open',
        merged_at: null,
        created_at: '2026-10-01T12:00:00Z',
      },
    ];

    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValueOnce(mockPrs),
    } as unknown as Response);

    const result = await service.fetchPullRequests('owner', 'repo');

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      externalId: '#42',
      title: 'feat: Test PR',
      author: 'dev',
      status: 'open',
    });
  });

  it('fetchPullRequests returns empty array on HTTP error without throwing', async () => {
    const service = new GithubService(mockDb as Database);

    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 404,
    } as unknown as Response);

    const result = await service.fetchPullRequests('owner', 'invalid-repo');
    expect(result).toEqual([]);
  });

  it('explains that a private repository must be selected in the App installation', async () => {
    const service = new GithubService(mockDb as Database);
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 404,
    } as unknown as Response);

    await expect(
      service.fetchPullRequests('grupo-azuos', 'admin-console', 'admin-id'),
    ).rejects.toThrow('O GitHub App não tem acesso a grupo-azuos/admin-console');
  });

  it('explains which installation permission is missing when issues are denied', async () => {
    const service = new GithubService(mockDb as Database);
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 403,
    } as unknown as Response);

    await expect(service.fetchIssues('grupo-azuos', 'admin-console', 'admin-id')).rejects.toThrow(
      'Issues: read',
    );
  });

  it('fetchPullRequests returns empty array on network exception without throwing', async () => {
    const service = new GithubService(mockDb as Database);

    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));

    const result = await service.fetchPullRequests('owner', 'repo');
    expect(result).toEqual([]);
  });

  it('createIssue returns null when GITHUB_TOKEN is not configured', async () => {
    delete process.env.GITHUB_TOKEN;
    const service = new GithubService(mockDb as Database);

    const result = await service.createIssue('owner', 'repo', 'Title', 'Body');
    expect(result).toBeNull();
  });

  it('createIssue makes POST request and returns issue info when token is set', async () => {
    process.env.GITHUB_TOKEN = 'test-token';
    const service = new GithubService(mockDb as Database);

    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: vi
        .fn()
        .mockResolvedValueOnce({ number: 99, html_url: 'https://github.com/owner/repo/issues/99' }),
    } as unknown as Response);

    const result = await service.createIssue('owner', 'repo', 'Bug', 'Body content');

    expect(result).toEqual({
      issueNumber: 99,
      issueUrl: 'https://github.com/owner/repo/issues/99',
    });
  });

  it('syncTicketToIssueInBackground executes asynchronously without throwing', () => {
    const service = new GithubService(mockDb as Database);

    expect(() => {
      service.syncTicketToIssueInBackground(
        10,
        1,
        'CH-0010',
        'Erro ao emitir relatório',
        'Descrição do chamado',
        'Solicitante',
      );
    }).not.toThrow();
  });
});

describe('co-authors', () => {
  // feliz
  it('reads Co-authored-by lines and the GitHub login hidden in a noreply e-mail', () => {
    expect(
      coAuthorTrailersOf(
        'feat: tela nova\n\nCo-authored-by: Guilherme Siqueira <123+gui-siqueira659@users.noreply.github.com>\nCo-Authored-By: Ana Lima <ana@empresa.com.br>',
      ),
    ).toEqual([
      { login: 'gui-siqueira659', name: 'Guilherme Siqueira' },
      { login: null, name: 'Ana Lima' },
    ]);
  });

  it('collects who committed in a branch, once each, without the person who merged', () => {
    const commit = (login: string | null, name: string, message = 'fix') => ({
      sha: name,
      html_url: '',
      commit: { message, author: { name } },
      author: login ? { login } : null,
      parents: [{ sha: 'p' }],
    });

    expect(
      coAuthorsOfCommits(
        [
          commit('gui-siqueira659', 'Guilherme Siqueira'),
          commit('gui-siqueira659', 'Guilherme Siqueira'),
          commit('vinicius-gpl', 'Vinicius Gabriel'),
        ],
        'vinicius-gpl',
      ),
    ).toEqual([{ login: 'gui-siqueira659', name: 'Guilherme Siqueira' }]);
  });

  // triste
  it('never counts an AI assistant or a bot as a co-author', () => {
    expect(
      coAuthorTrailersOf(
        'feat\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>\nCo-authored-by: dependabot[bot] <49699333+dependabot[bot]@users.noreply.github.com>',
      ),
    ).toEqual([]);
  });
});

/**
 * Um banco de mentira com as três formas que o serviço usa: `select().from().where().limit()`,
 * `update().set().where()` e `insert().values()`. Cada chamada termina numa Promise, como no
 * Drizzle; o que o teste quer ver é o que foi gravado.
 */
function fakeDb(project: Record<string, unknown> | null) {
  const updates: unknown[] = [];
  const inserts: unknown[] = [];
  const db = {
    select: () => ({
      from: () => ({ where: () => ({ limit: async () => (project ? [project] : []) }) }),
    }),
    update: () => ({
      set: (values: unknown) => ({
        where: async () => {
          updates.push(values);
        },
      }),
    }),
    insert: () => ({
      values: async (values: unknown) => {
        inserts.push(values);
      },
    }),
  };

  return { db: db as unknown as Database, updates, inserts };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const mergeCommit = (sha: string, overrides: Record<string, unknown> = {}) => ({
  sha,
  html_url: `https://github.com/org/repo/commit/${sha}`,
  commit: { message: `Merge ${sha}`, committer: { date: '2026-10-16T12:00:00Z' } },
  author: { login: 'dev' },
  parents: [{ sha: 'one' }, { sha: 'two' }],
  ...overrides,
});

describe('GithubService: local merges', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // feliz
  it('reads the branch of a local merge to find who committed in it, page by page', async () => {
    const service = new GithubService({} as Database);
    vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
      const address = String(url);
      if (address.endsWith('/pulls')) return new Response('[]');
      if (address.includes('/compare/')) {
        return new Response(
          JSON.stringify({
            commits: [
              {
                sha: 'c1',
                html_url: '',
                commit: { message: 'feat', author: { name: 'Bia' } },
                author: { login: 'bia' },
                parents: [],
              },
            ],
          }),
        );
      }
      if (address.includes('/users/')) return new Response('{}', { status: 500 });
      if (address.includes('page=2')) {
        return new Response(
          JSON.stringify([
            mergeCommit('bbb1234567', {
              author: null,
              commit: { message: 'Merge local', author: { name: 'Dev Sem Login' } },
            }),
          ]),
        );
      }

      return new Response(
        JSON.stringify([
          mergeCommit('aaa1234567', {
            commit: { message: '', author: { date: '2026-10-15T10:00:00Z', name: 'Dev' } },
          }),
        ]),
        { headers: { link: '<https://api.github.com/x?page=2>; rel="next"' } },
      );
    });

    const merges = await service.fetchLocalMerges('org', 'repo');

    expect(merges).toHaveLength(2);
    expect(merges[0]).toMatchObject({
      title: 'Merge aaa1234',
      authorName: 'dev',
      coAuthors: [{ login: 'bia', name: 'Bia' }],
      eventDate: new Date('2026-10-15T10:00:00Z'),
    });
    /* Sem login: o nome de quem fez o commit vale como autor, e a data é a de agora. */
    expect(merges[1]?.author).toBe('Dev Sem Login');
    expect(merges[1]?.eventDate).toBeInstanceOf(Date);
  });

  // triste
  it('explains the missing repository access when the sync is for a person', async () => {
    const service = new GithubService({} as Database);
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response('', { status: 404 }));

    await expect(service.fetchLocalMerges('org', 'repo', 'user-1')).rejects.toThrow(
      'não tem acesso a org/repo',
    );
    await expect(service.fetchLocalMerges('org', 'repo')).resolves.toEqual([]);
  });

  it('turns a network failure into a bad gateway only for a person', async () => {
    const service = new GithubService({} as Database);
    vi.spyOn(global, 'fetch').mockRejectedValue(new TypeError('fetch failed'));

    await expect(service.fetchLocalMerges('org', 'repo', 'user-1')).rejects.toThrow(
      'Não foi possível sincronizar os merges sem PR',
    );
    await expect(service.fetchLocalMerges('org', 'repo')).resolves.toEqual([]);
  });

  it('keeps the message when the pull requests of a commit cannot be read', async () => {
    const service = new GithubService({} as Database);
    vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
      if (String(url).endsWith('/pulls')) return new Response('', { status: 403 });

      return new Response(JSON.stringify([mergeCommit('ccc1234567')]));
    });

    await expect(service.fetchLocalMerges('org', 'repo', 'user-1')).rejects.toThrow(
      'Não foi possível identificar os merges sem PR',
    );
  });

  it('explains the other refusals of the repository with the HTTP status', async () => {
    const service = new GithubService({} as Database);
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response('', { status: 403 }));
    await expect(service.fetchLocalMerges('org', 'repo', 'user-1')).rejects.toThrow(
      'Contents: read',
    );

    vi.spyOn(global, 'fetch').mockResolvedValue(new Response('', { status: 500 }));
    await expect(service.fetchIssues('org', 'repo', 'user-1')).rejects.toThrow('(HTTP 500)');
    await expect(service.fetchIssues('org', 'repo')).rejects.toThrow(
      'Não foi possível sincronizar as issues',
    );
  });
});

describe('GithubService: pull request pages and co-authors', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const pr = (number: number, overrides: Record<string, unknown> = {}) => ({
    number,
    title: `PR ${number}`,
    html_url: `https://github.com/org/repo/pull/${number}`,
    user: { login: 'dev' },
    state: 'closed',
    merged_at: new Date().toISOString(),
    created_at: '2026-10-01T12:00:00Z',
    ...overrides,
  });

  // feliz
  it('reads the commits of a merged pull request to name the co-authors', async () => {
    const service = new GithubService({} as Database);
    const fetcher = vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
      const address = String(url);
      if (address.includes('/pulls?')) {
        return new Response(JSON.stringify([pr(1), pr(2, { user: undefined, merged_at: null })]));
      }
      if (address.includes('/users/dev')) return new Response(JSON.stringify({ name: '' }));
      if (address.includes('/pulls/1/commits')) {
        return new Response(
          JSON.stringify([
            {
              sha: 'c1',
              html_url: '',
              commit: { message: 'feat', author: { name: 'Caio' } },
              author: { login: 'caio' },
              parents: [],
            },
          ]),
        );
      }

      return new Response('[]');
    });

    const result = await service.fetchPullRequests('org', 'repo');

    expect(result[0]).toMatchObject({ authorName: 'dev', coAuthors: [{ login: 'caio', name: 'Caio' }] });
    /* Sem usuário no GitHub, o autor é "github"; fechado sem merge é `closed`. */
    expect(result[1]).toMatchObject({ author: 'github', status: 'closed' });
    expect(result[1]).not.toHaveProperty('coAuthors');
    /* O nome de cada login é lido UMA vez — a segunda pergunta sai do cache. */
    await service.fetchPullRequests('org', 'repo');
    expect(fetcher.mock.calls.filter(([url]) => String(url).includes('/users/dev'))).toHaveLength(1);
  });

  it('stops reading commits when GitHub refuses a page', async () => {
    const service = new GithubService({} as Database);
    vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
      const address = String(url);
      if (address.includes('/pulls?')) return new Response(JSON.stringify([pr(1)]));
      if (address.includes('/commits')) return new Response('', { status: 500 });

      return new Response('{}');
    });

    const [merged] = await service.fetchPullRequests('org', 'repo');

    expect(merged?.coAuthors).toEqual([]);
  });

  it('follows the next pages of the list', async () => {
    const service = new GithubService({} as Database);
    vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
      const address = String(url);
      if (address.includes('/pulls?') && address.includes('page=2')) {
        return new Response(JSON.stringify([pr(2, { merged_at: null, state: 'open' })]));
      }
      if (address.includes('/pulls?')) {
        return new Response(JSON.stringify([pr(1, { merged_at: null, state: 'open' })]), {
          headers: { link: '<https://api.github.com/x?page=2>; rel="next"' },
        });
      }

      return new Response('{}');
    });

    const result = await service.fetchPullRequests('org', 'repo');

    expect(result.map((item) => item.externalId)).toEqual(['#1', '#2']);
  });

  // triste
  it('gives up the whole list when a next page fails, and says so to a person', async () => {
    const service = new GithubService({} as Database);
    vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
      const address = String(url);
      if (address.includes('page=2')) return new Response('', { status: 502 });

      return new Response(JSON.stringify([pr(1, { merged_at: null, state: 'open' })]), {
        headers: { link: '<https://api.github.com/x?page=2>; rel="next"' },
      });
    });

    await expect(service.fetchPullRequests('org', 'repo', 'user-1')).rejects.toThrow(
      'Não foi possível carregar todos os PRs',
    );
    await expect(service.fetchPullRequests('org', 'repo')).resolves.toEqual([]);
  });

  it('names the issues our App closed as the Chamados bot, across pages', async () => {
    const service = new GithubService({} as Database);
    const issue = (number: number, login: string, state: string) => ({
      number,
      title: `Issue ${number}`,
      html_url: `https://github.com/org/repo/issues/${number}`,
      user: { login },
      state,
      created_at: '2026-10-01T12:00:00Z',
      closed_at: '2026-10-02T12:00:00Z',
      closed_by: state === 'closed' ? { login } : null,
    });
    vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
      const address = String(url);
      if (address.includes('/users/')) return new Response(JSON.stringify({ name: 'Pessoa' }));
      if (address.includes('page=2')) {
        return new Response(JSON.stringify([issue(2, 'app-chamados[bot]', 'closed')]));
      }

      return new Response(JSON.stringify([issue(1, 'ana', 'open')]), {
        headers: { link: '<https://api.github.com/x?page=2>; rel="next"' },
      });
    });

    const result = await service.fetchIssues('org', 'repo');

    expect(result.map((item) => item.authorName)).toEqual(['Pessoa', CHAMADOS_BOT_NAME]);
  });
});

describe('GithubService: issues in the background', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.GITHUB_TOKEN;
  });

  // feliz
  it('comments and closes the issue of the ticket, with the organization token', async () => {
    const { db } = fakeDb({ id: 1, githubRepoOwner: 'org', githubRepoName: 'repo', repositoryUrl: 'x' });
    const app = { accessToken: vi.fn().mockResolvedValue('app-token') };
    const service = new GithubService(db, app as unknown as GithubAppService);
    const fetcher = vi.spyOn(global, 'fetch').mockResolvedValue(new Response('{}'));

    service.mirrorTicketToIssueInBackground(
      { id: 7, projectId: 1, githubIssueNumber: 12 },
      { comment: 'Resolvido.', state: 'closed' },
    );
    await flush();

    const calls = fetcher.mock.calls.map(([url, init]) => [String(url), init?.method]);
    expect(calls).toEqual([
      ['https://api.github.com/repos/org/repo/issues/12/comments', 'POST'],
      ['https://api.github.com/repos/org/repo/issues/12', 'PATCH'],
    ]);
    expect(JSON.parse(String(fetcher.mock.calls[1]?.[1]?.body))).toEqual({
      state: 'closed',
      state_reason: 'completed',
    });
  });

  it('reopens the issue reading the repository from the link of the system', async () => {
    const { db } = fakeDb({ id: 1, githubRepoOwner: null, githubRepoName: null, repositoryUrl: 'org/repo' });
    const service = new GithubService(db);
    const fetcher = vi.spyOn(global, 'fetch').mockResolvedValue(new Response('{}'));

    service.mirrorTicketToIssueInBackground(
      { id: 7, projectId: 1, githubIssueNumber: 12 },
      { state: 'open' },
    );
    await flush();

    expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toEqual({
      state: 'open',
      state_reason: 'reopened',
    });
  });

  it('creates the issue of a new ticket and writes the link back, plus the timeline', async () => {
    process.env.GITHUB_TOKEN = 'token';
    const { db, updates, inserts } = fakeDb({
      id: 1,
      githubRepoOwner: 'org',
      githubRepoName: 'repo',
      repositoryUrl: 'x',
    });
    const service = new GithubService(db);
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ number: 5, html_url: 'https://github.com/org/repo/issues/5' })),
    );

    service.syncTicketToIssueInBackground(10, 1, 'CH-0010', 'Erro', 'Descrição', 'Marta');
    await flush();

    expect(updates[0]).toEqual({
      githubIssueNumber: 5,
      githubIssueUrl: 'https://github.com/org/repo/issues/5',
    });
    expect(inserts[0]).toMatchObject({ projectId: 1, type: 'issue', externalId: '#5' });
  });

  // triste
  it('does nothing without a project, an issue or a change', async () => {
    const { db } = fakeDb(null);
    const service = new GithubService(db);
    const fetcher = vi.spyOn(global, 'fetch').mockResolvedValue(new Response('{}'));

    service.mirrorTicketToIssueInBackground({ id: 1, projectId: null, githubIssueNumber: 3 }, { state: 'open' });
    service.mirrorTicketToIssueInBackground({ id: 1, projectId: 1, githubIssueNumber: 3 }, {});
    /* Sistema apagado: a issue fica como está. */
    service.mirrorTicketToIssueInBackground({ id: 1, projectId: 1, githubIssueNumber: 3 }, { state: 'open' });
    service.syncTicketToIssueInBackground(10, 1, 'CH-0010', 'Erro', 'Descrição', 'Marta');
    await flush();

    expect(fetcher).not.toHaveBeenCalled();
  });

  it('only warns when GitHub refuses the change or the link cannot be parsed', async () => {
    const refused = fakeDb({ id: 1, githubRepoOwner: 'org', githubRepoName: 'repo', repositoryUrl: 'x' });
    const service = new GithubService(refused.db);
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response('', { status: 422 }));

    service.mirrorTicketToIssueInBackground({ id: 1, projectId: 1, githubIssueNumber: 3 }, { comment: 'x' });
    service.syncTicketToIssueInBackground(10, 1, 'CH-0010', 'Erro', 'Descrição', 'Marta');
    await flush();
    expect(refused.updates).toEqual([]);

    const unparsable = fakeDb({ id: 1, githubRepoOwner: null, githubRepoName: null, repositoryUrl: 'sem-link' });
    const other = new GithubService(unparsable.db);
    other.syncTicketToIssueInBackground(10, 1, 'CH-0010', 'Erro', 'Descrição', 'Marta');
    other.mirrorTicketToIssueInBackground({ id: 1, projectId: 1, githubIssueNumber: 3 }, { comment: 'x' });
    await flush();
    expect(unparsable.updates).toEqual([]);
  });

  it('answers null when the issue cannot be created, by refusal or by network', async () => {
    const service = new GithubService({} as Database);

    vi.spyOn(global, 'fetch').mockResolvedValueOnce(new Response('nope', { status: 403 }));
    expect(await service.createIssue('org', 'repo', 'T', 'B', 'token')).toBeNull();

    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new TypeError('fetch failed'));
    expect(await service.createIssue('org', 'repo', 'T', 'B', 'token')).toBeNull();
  });
});
