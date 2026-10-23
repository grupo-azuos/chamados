import { Inject, Injectable, Logger, Optional, BadGatewayException } from '@nestjs/common';
import { GithubAppService } from '../../github-integration/service/github-app.service';
import { parseGitHubRepo } from '@template/shared/domain/software-project.util';
import { eq } from 'drizzle-orm';

import { DB } from '../../../lib/db/db.token';
import { type Database } from '../../../lib/db/db.type';
import { softwareProjects } from '../../../lib/db/schema/software-projects.schema';
import { softwareTimelineEvents } from '../../../lib/db/schema/software-timeline-events.schema';
import { tickets } from '../../../lib/db/schema/tickets.schema';

/** Quem mais trabalhou num PR ou merge: o login quando o GitHub o conhece, e o nome. */
export type FetchedCoAuthor = { login: string | null; name: string };

export type FetchedPr = {
  externalId: string;
  title: string;
  url: string;
  author: string;
  authorName: string;
  status: 'open' | 'merged' | 'closed';
  eventDate: Date;
  coAuthors?: FetchedCoAuthor[];
};

export type FetchedMerge = {
  externalId: string;
  title: string;
  url: string;
  author: string;
  authorName: string;
  status: 'merged';
  eventDate: Date;
  coAuthors?: FetchedCoAuthor[];
};

type RawGithubPr = {
  number: number;
  title: string;
  html_url: string;
  user?: { login?: string };
  state: string;
  merged_at?: string | null;
  created_at: string;
  updated_at?: string;
};

type RawGithubUser = { name?: string | null };

type RawGithubCommit = {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    committer?: { date?: string; name?: string };
    author?: { date?: string; name?: string; email?: string };
  };
  author?: { login?: string } | null;
  parents: Array<{ sha: string }>;
};

/* Quantas chamadas ao GitHub saem ao mesmo tempo. Uma por merge, todas juntas, esbarrava no
   limite secundário do GitHub (403) — e um 403 derrubava o sync do repositório inteiro. */
const GITHUB_CONCURRENCY = 6;
/* Até quantos commits de uma branch ou PR são lidos para achar os co-autores. */
const MAX_COMMITS_FOR_COAUTHORS = 250;
/* Co-autores de PR só dos mergeados nos últimos 120 dias: o histórico inteiro, num
   "Sincronizar todos", passaria de mil chamadas e o clique estouraria o tempo. */
const COAUTHOR_WINDOW_MS = 120 * 24 * 60 * 60 * 1000;

/** Quem não é gente: assistente de IA e robôs não contam como co-autor de ninguém. */
function isAutomation(login: string | null, name: string, email?: string): boolean {
  if (login?.endsWith('[bot]')) return true;
  if (email && /noreply@anthropic\.com|\[bot\]@users\.noreply\.github\.com/i.test(email)) return true;

  return /\[bot\]|^claude\b|github-actions|dependabot/i.test(name.trim());
}

/** As linhas `Co-authored-by: Nome <email>` de uma mensagem de commit. */
export function coAuthorTrailersOf(message: string): FetchedCoAuthor[] {
  return [...message.matchAll(/^co-authored-by:\s*(.+?)\s*<([^>]*)>\s*$/gim)]
    .map((match) => ({ name: (match[1] ?? '').trim(), email: (match[2] ?? '').trim() }))
    .filter((person) => person.name !== '' && !isAutomation(null, person.name, person.email))
    .map((person) => ({ login: loginFromNoreply(person.email), name: person.name }));
}

/** `123+login@users.noreply.github.com` diz o login; outro e-mail não diz. */
function loginFromNoreply(email: string): string | null {
  return email.match(/^(?:\d+\+)?([^@]+)@users\.noreply\.github\.com$/i)?.[1] ?? null;
}

/**
 * Os co-autores de uma LISTA de commits: quem fez cada commit e quem aparece nos
 * `Co-authored-by`, sem repetir e sem o autor principal (`except`).
 */
export function coAuthorsOfCommits(
  commits: readonly RawGithubCommit[],
  except: string | null,
): FetchedCoAuthor[] {
  const people = commits.flatMap((commit) => {
    const login = commit.author?.login ?? null;
    const name = commit.commit.author?.name?.trim() ?? login ?? '';
    const own =
      name && !isAutomation(login, name, commit.commit.author?.email) ? [{ login, name }] : [];

    return [...own, ...coAuthorTrailersOf(commit.commit.message)];
  });
  const seen = new Set<string>();
  const exceptKey = except?.toLowerCase() ?? null;

  return people.filter((person) => {
    const key = (person.login ?? person.name).toLowerCase();
    if (key === exceptKey || seen.has(key)) return false;
    seen.add(key);

    return true;
  });
}

/** Roda `work` em cada item com no máximo `limit` ao mesmo tempo, na ordem original. */
async function inPool<T, R>(items: readonly T[], limit: number, work: (item: T) => Promise<R>) {
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await work(items[index] as T);
      }
    }),
  );

  return results;
}

/** Como aparece o que o App da organização faz no GitHub (as issues abertas a partir de chamados). */
export const CHAMADOS_BOT_NAME = 'GitHub Chamados Bot';

function resolvePrStatus(mergedAt?: string | null, state?: string): 'open' | 'merged' | 'closed' {
  if (mergedAt) return 'merged';
  if (state === 'closed') return 'closed';
  return 'open';
}

function mapRawPr(pr: RawGithubPr): FetchedPr {
  return {
    externalId: `#${pr.number}`,
    title: pr.title,
    url: pr.html_url,
    author: pr.user?.login ?? 'github',
    authorName: pr.user?.login ?? 'github',
    status: resolvePrStatus(pr.merged_at, pr.state),
    eventDate: new Date(pr.merged_at ?? pr.created_at),
  };
}

function isUpdatedSince(pr: RawGithubPr, since: Date): boolean {
  return Date.parse(pr.updated_at ?? pr.created_at) >= since.getTime();
}

/**
 * Há próxima página que interessa? Sem `since`, toda página que o GitHub anunciar. Com `since`,
 * para quando o último PR já lido é anterior à data: a lista vem em ordem de alteração.
 */
function hasNextPage(response: Response, list: RawGithubPr[], since?: Date): boolean {
  if (!response.headers?.get('link')?.includes('rel="next"')) return false;
  const last = list.at(-1);
  if (!since || !last) return true;

  return isUpdatedSince(last, since);
}

@Injectable()
export class GithubService {
  private readonly logger = new Logger(GithubService.name);
  private readonly authorNames = new Map<string, Promise<string>>();

  constructor(
    @Inject(DB) private readonly db: Database,
    @Optional() private readonly app?: GithubAppService,
  ) {}

  private get token(): string | undefined {
    return process.env.GITHUB_TOKEN;
  }

  private headers(token = this.token): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'AzuosTicket-Dashboard',
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  }

  private authorName(login: string, token?: string): Promise<string> {
    const cached = this.authorNames.get(login);
    if (cached) return cached;

    const lookup = fetch(`https://api.github.com/users/${encodeURIComponent(login)}`, {
      headers: this.headers(token),
      signal: AbortSignal.timeout(10_000),
    })
      .then(async (response) => {
        if (!response.ok) return login;
        const user = (await response.json()) as RawGithubUser;
        return user.name?.trim() || login;
      })
      .catch(() => login);

    this.authorNames.set(login, lookup);
    return lookup;
  }

  private async addAuthorNames<T extends { author: string }>(
    items: T[],
    token?: string,
  ): Promise<(T & { authorName: string })[]> {
    const logins = [...new Set(items.map((item) => item.author))];
    const names = new Map<string, string>();
    let nextLogin = 0;
    await Promise.all(
      Array.from({ length: Math.min(8, logins.length) }, async () => {
        while (nextLogin < logins.length) {
          const login = logins[nextLogin++];
          if (login) names.set(login, await this.authorName(login, token));
        }
      }),
    );
    return items.map((item) => ({ ...item, authorName: names.get(item.author) ?? item.author }));
  }

  /**
   * Busca os Pull Requests de um repositório no GitHub.
   *
   * Com `since`, traz só os que mudaram desde então: a lista vem do mais recentemente alterado
   * para trás, e a paginação para assim que uma página já começa antes da data. É o que deixa a
   * rodada da meia-noite barata mesmo em repositório com centenas de PRs.
   */
  async fetchPullRequests(
    owner: string,
    repo: string,
    userId?: string,
    since?: Date,
  ): Promise<FetchedPr[]> {
    const token = this.app ? await this.app.accessToken() : this.token;
    const order = since ? '&sort=updated&direction=desc' : '';
    const url = `https://api.github.com/repos/${owner}/${repo}/pulls?state=all&per_page=100${order}`;

    try {
      const response = await fetch(url, {
        headers: this.headers(token),
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        return this.handlePrFetchFailure(response.status, owner, repo, userId);
      }

      const list = (await response.json()) as RawGithubPr[];
      await this.fetchSubsequentPrPages(url, token, response, list, since);
      const recent = since ? list.filter((pr) => isUpdatedSince(pr, since)) : list;
      const named = await this.addAuthorNames(recent.map(mapRawPr), token);

      const windowStart = Date.now() - COAUTHOR_WINDOW_MS;

      return inPool(named, GITHUB_CONCURRENCY, async (pr) =>
        pr.status === 'merged' && pr.eventDate.getTime() >= windowStart
          ? { ...pr, coAuthors: await this.prCoAuthors(owner, repo, pr, token) }
          : pr,
      );
    } catch (error) {
      return this.handlePrCatchError(error, owner, repo, userId);
    }
  }

  /**
   * Quem mais fez commit no PR. Falha aqui não derruba o sync: o PR entra só com o autor.
   * `Pull requests: read` basta — é a permissão que o App já tem.
   */
  private async prCoAuthors(
    owner: string,
    repo: string,
    pr: FetchedPr,
    token: string | undefined,
  ): Promise<FetchedCoAuthor[]> {
    const number = pr.externalId.replace('#', '');
    const commits = await this.readCommits(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${number}/commits?per_page=100`,
      token,
    );

    return coAuthorsOfCommits(commits, pr.author);
  }

  /**
   * Quem fez os commits da branch que um merge local trouxe: o que está no segundo pai e não
   * estava no primeiro. Sem isto, a branch do Guilherme juntada por outra pessoa só contava
   * para quem juntou.
   */
  private async branchCoAuthors(
    owner: string,
    repo: string,
    commit: RawGithubCommit,
    token: string | undefined,
  ): Promise<FetchedCoAuthor[]> {
    const [base, head] = commit.parents;
    if (!base || !head) return [];
    const compared = await this.readJson<{ commits?: RawGithubCommit[] }>(
      `https://api.github.com/repos/${owner}/${repo}/compare/${base.sha}...${head.sha}?per_page=100`,
      token,
    );
    const commits = [...(compared?.commits ?? []).slice(0, MAX_COMMITS_FOR_COAUTHORS), commit];

    return coAuthorsOfCommits(commits, commit.author?.login ?? null);
  }

  /** As páginas de commits de uma rota, até o teto. Erro vira lista vazia, com aviso no log. */
  private async readCommits(url: string, token: string | undefined): Promise<RawGithubCommit[]> {
    const commits: RawGithubCommit[] = [];
    for (let page = 1; commits.length < MAX_COMMITS_FOR_COAUTHORS; page++) {
      const list = await this.readJson<RawGithubCommit[]>(`${url}&page=${page}`, token);
      if (!Array.isArray(list) || list.length === 0) break;
      commits.push(...list);
      if (list.length < 100) break;
    }

    return commits;
  }

  private async readJson<T>(url: string, token: string | undefined): Promise<T | null> {
    try {
      const response = await fetch(url, {
        headers: this.headers(token),
        signal: AbortSignal.timeout(10_000),
      });
      if (response.ok) return (await response.json()) as T;
      this.logger.warn(`GitHub API devolveu status ${response.status} para ${url}`);
    } catch (error) {
      this.logger.warn(`Falha ao ler ${url} no GitHub: ${String(error)}`);
    }

    return null;
  }

  private handlePrFetchFailure(
    status: number,
    owner: string,
    repo: string,
    userId?: string,
  ): FetchedPr[] {
    if (userId) {
      throw this.repositoryAccessError(status, owner, repo, 'Pull requests: read');
    }
    this.logger.warn(`GitHub API devolveu status ${status} ao buscar PRs de ${owner}/${repo}`);
    return [];
  }

  private async fetchSubsequentPrPages(
    url: string,
    token: string | undefined,
    initialResponse: Response,
    list: RawGithubPr[],
    since?: Date,
  ): Promise<void> {
    let response = initialResponse;
    for (let page = 2; hasNextPage(response, list, since); page++) {
      response = await fetch(`${url}&page=${page}`, {
        headers: this.headers(token),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) {
        throw new BadGatewayException('Não foi possível carregar todos os PRs do repositório.');
      }
      list.push(...((await response.json()) as RawGithubPr[]));
    }
  }

  private handlePrCatchError(
    error: unknown,
    owner: string,
    repo: string,
    userId?: string,
  ): FetchedPr[] {
    if (!userId) {
      this.logger.warn(
        `Falha na comunicação com o GitHub para PRs de ${owner}/${repo}: ${String(error)}`,
      );
      return [];
    }
    if (error instanceof BadGatewayException) throw error;
    throw new BadGatewayException('Não foi possível sincronizar com o GitHub. Tente novamente.');
  }

  /**
   * Busca as issues — abertas e fechadas. Com `since`, só as que mudaram desde então (o
   * próprio GitHub filtra: fechar uma issue conta como mudança).
   */
  async fetchIssues(
    owner: string,
    repo: string,
    userId?: string,
    since?: Date,
  ): Promise<FetchedPr[]> {
    const token = this.app ? await this.app.accessToken() : this.token;
    const items: FetchedPr[] = [];
    const sinceParam = since ? `&since=${encodeURIComponent(since.toISOString())}` : '';
    for (let page = 1; ; page++) {
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/issues?state=all&per_page=100&page=${page}${sinceParam}`,
        {
          headers: this.headers(token),
          signal: AbortSignal.timeout(10_000),
        },
      );
      if (!response.ok) {
        throw this.issueFetchError(response.status, owner, repo, userId);
      }
      const rows = (await response.json()) as Array<{
        number: number;
        title: string;
        html_url: string;
        user?: { login?: string };
        state: string;
        pull_request?: unknown;
        created_at: string;
        closed_at?: string | null;
        closed_by?: { login?: string } | null;
        performed_via_github_app?: { id?: number } | null;
      }>;
      const appId = this.app?.appId ?? null;
      const pageItems = rows
        .filter((row) => !row.pull_request)
        .map((row) => ({
          externalId: `#${row.number}`,
          title: row.title,
          url: row.html_url,
          author:
            row.state === 'closed'
              ? (row.closed_by?.login ?? 'github')
              : (row.user?.login ?? 'github'),
          status: row.state === 'closed' ? ('closed' as const) : ('open' as const),
          eventDate: new Date(
            row.state === 'closed' && row.closed_at ? row.closed_at : row.created_at,
          ),
        }));
      /* Issue aberta pelo nosso App (a partir de um chamado): quem aparece é o bot, com nome de
         gente, e não `app-chamados[bot]`. Fechada, o autor é quem fechou — essa é uma pessoa. */
      const ownBotIssues = new Set(
        rows
          .filter((row) => !row.pull_request && row.state !== 'closed')
          .filter((row) => appId !== null && row.performed_via_github_app?.id === appId)
          .map((row) => `#${row.number}`),
      );
      const named = await this.addAuthorNames(pageItems, token);
      /* Fechada por robô — o nosso App fecha a issue quando o chamado é encerrado — também
         aparece como o bot, e não como `app-chamados[bot]` resolvendo issue. */
      items.push(
        ...named.map((item) =>
          ownBotIssues.has(item.externalId) ||
          (item.status === 'closed' && item.author.endsWith('[bot]'))
            ? { ...item, authorName: CHAMADOS_BOT_NAME }
            : item,
        ),
      );
      if (!response.headers.get('link')?.includes('rel="next"')) return items;
    }
  }

  /**
   * Lista merges sem PR que chegaram à branch develop. Commits associados a PRs são ignorados,
   * para não contar duas vezes a mesma entrega já exibida como Pull Request.
   */
  async fetchLocalMerges(
    owner: string,
    repo: string,
    userId?: string,
    since?: Date,
  ): Promise<FetchedMerge[]> {
    const token = this.app ? await this.app.accessToken() : this.token;
    const sinceParam = since ? `&since=${encodeURIComponent(since.toISOString())}` : '';
    const baseUrl = `https://api.github.com/repos/${owner}/${repo}/commits?sha=develop&per_page=100${sinceParam}`;

    try {
      return await this.collectLocalMerges(baseUrl, owner, repo, token, userId);
    } catch (error) {
      return this.localMergesErrorFallback(error, owner, repo, userId);
    }
  }

  /** Percorre as páginas de commits da develop juntando os merges sem PR. */
  private async collectLocalMerges(
    baseUrl: string,
    owner: string,
    repo: string,
    token: string | undefined,
    userId?: string,
  ): Promise<FetchedMerge[]> {
    const merges: FetchedMerge[] = [];

    for (let page = 1; ; page++) {
      const response = await fetch(`${baseUrl}&page=${page}`, {
        headers: this.headers(token),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) return this.localMergesStatusFallback(response.status, owner, repo, userId);

      const commits = (await response.json()) as RawGithubCommit[];
      merges.push(...(await this.localMergesOf(commits, owner, repo, token)));
      if (!response.headers.get('link')?.includes('rel="next"')) break;
    }

    return this.addAuthorNames(merges, token);
  }

  /** Dos commits de uma página, só os merges que não vieram de PR. */
  private async localMergesOf(
    commits: RawGithubCommit[],
    owner: string,
    repo: string,
    token: string | undefined,
  ): Promise<FetchedMerge[]> {
    const candidates = commits.filter((commit) => commit.parents.length > 1);
    const local = await inPool(candidates, GITHUB_CONCURRENCY, (commit) =>
      this.toLocalMerge(commit, owner, repo, token),
    );

    return local.filter((merge): merge is FetchedMerge => merge !== null);
  }

  /**
   * O merge que fechou um PR devolve `null`: ele já aparece como Pull Request. Só esse — o
   * GitHub também associa ao commit qualquer PR que apenas o CONTÉM, como um PR aberto da
   * develop para a main, e descartar por isso escondia do cronograma o trabalho de dias.
   */
  private async toLocalMerge(
    commit: RawGithubCommit,
    owner: string,
    repo: string,
    token: string | undefined,
  ): Promise<FetchedMerge | null> {
    const associated = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/commits/${commit.sha}/pulls`,
      { headers: this.headers(token), signal: AbortSignal.timeout(10_000) },
    );
    if (!associated.ok) throw new BadGatewayException('Não foi possível identificar os merges sem PR.');
    const pullRequests = (await associated.json()) as Array<{ merge_commit_sha?: string | null }>;
    if (pullRequests.some((pr) => pr.merge_commit_sha === commit.sha)) return null;

    return {
      ...localMergeFromCommit(commit),
      coAuthors: await this.branchCoAuthors(owner, repo, commit, token),
    };
  }

  /** Na sincronização pedida por alguém o erro sobe; na automática, só registra e segue. */
  private localMergesStatusFallback(
    status: number,
    owner: string,
    repo: string,
    userId?: string,
  ): FetchedMerge[] {
    if (userId) throw this.repositoryAccessError(status, owner, repo, 'Contents: read');
    this.logger.warn(`GitHub API devolveu status ${status} ao buscar merges de ${owner}/${repo}`);
    return [];
  }

  private localMergesErrorFallback(
    error: unknown,
    owner: string,
    repo: string,
    userId?: string,
  ): FetchedMerge[] {
    if (!userId) {
      this.logger.warn(`Falha na comunicação com o GitHub para merges de ${owner}/${repo}: ${String(error)}`);
      return [];
    }
    if (error instanceof BadGatewayException) throw error;
    throw new BadGatewayException('Não foi possível sincronizar os merges sem PR. Tente novamente.');
  }

  private issueFetchError(
    status: number,
    owner: string,
    repo: string,
    userId?: string,
  ): BadGatewayException {
    return userId
      ? this.repositoryAccessError(status, owner, repo, 'Issues: read')
      : new BadGatewayException('Não foi possível sincronizar as issues do repositório.');
  }

  private repositoryAccessError(
    status: number,
    owner: string,
    repo: string,
    permission: string,
  ): BadGatewayException {
    if (status === 404)
      return new BadGatewayException(
        `O GitHub App não tem acesso a ${owner}/${repo}. Inclua o repositório na instalação da organização e confirme as permissões do App.`,
      );
    if (status === 403)
      return new BadGatewayException(
        `A instalação do GitHub App não tem a permissão ${permission} para ${owner}/${repo}, ou a organização ainda precisa aprovar a atualização.`,
      );
    return new BadGatewayException(
      `O GitHub recusou a consulta de ${permission} para ${owner}/${repo} (HTTP ${status}).`,
    );
  }

  /**
   * Cria uma Issue no GitHub para um chamado.
   */
  async createIssue(
    owner: string,
    repo: string,
    title: string,
    body: string,
    accessToken = this.token,
  ): Promise<{ issueNumber: number; issueUrl: string } | null> {
    if (!accessToken) {
      this.logger.log(
        `GITHUB_TOKEN não configurado. Issue não criada no GitHub para ${owner}/${repo}.`,
      );
      return null;
    }

    const url = `https://api.github.com/repos/${owner}/${repo}/issues`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...this.headers(accessToken),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, body }),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.warn(`GitHub API recusou criação de Issue (${response.status}): ${errorText}`);
        return null;
      }

      const json = (await response.json()) as { number: number; html_url: string };
      return {
        issueNumber: json.number,
        issueUrl: json.html_url,
      };
    } catch (error) {
      this.logger.warn(`Falha ao criar Issue no GitHub: ${String(error)}`);
      return null;
    }
  }

  /**
   * O que acontece no CHAMADO chega à ISSUE dele, em segundo plano: o comentário (cada
   * histórico lançado) e o estado (encerrar o chamado fecha a issue; reabrir reabre).
   *
   * Segundo plano porque o GitHub fora do ar não pode impedir ninguém de atender: o histórico
   * já foi gravado aqui, e a falha vai para o log. Chamado sem issue (de outra área, ou sem
   * sistema) não faz nada.
   */
  mirrorTicketToIssueInBackground(
    ticket: { id: number; projectId: number | null; githubIssueNumber: number | null },
    change: { comment?: string; state?: 'open' | 'closed' },
  ): void {
    if (!ticket.projectId || !ticket.githubIssueNumber) return;
    if (!change.comment && !change.state) return;
    const { projectId, githubIssueNumber } = ticket;

    void (async () => {
      try {
        const repoInfo = await this.repositoryOfProject(projectId);
        if (!repoInfo) return;
        const token = this.app ? await this.app.accessToken() : this.token;
        const issueUrl = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/issues/${githubIssueNumber}`;
        if (change.comment) {
          await this.sendIssueChange(`${issueUrl}/comments`, 'POST', { body: change.comment }, token);
        }
        if (change.state) {
          const reason = change.state === 'closed' ? 'completed' : 'reopened';
          await this.sendIssueChange(issueUrl, 'PATCH', { state: change.state, state_reason: reason }, token);
        }
      } catch (error) {
        this.logger.warn(`Não consegui levar o chamado ${ticket.id} para a issue: ${String(error)}`);
      }
    })();
  }

  private async sendIssueChange(
    url: string,
    method: 'POST' | 'PATCH',
    body: Record<string, string>,
    token: string | undefined,
  ): Promise<void> {
    const response = await fetch(url, {
      method,
      headers: { ...this.headers(token), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`GitHub answered ${response.status} for ${method} ${url}`);
  }

  /** O repositório de um sistema: as colunas já separadas, ou o que der para ler do endereço. */
  private async repositoryOfProject(projectId: number): Promise<{ owner: string; repo: string } | null> {
    const [project] = await this.db
      .select()
      .from(softwareProjects)
      .where(eq(softwareProjects.id, projectId))
      .limit(1);
    if (!project) return null;

    return project.githubRepoOwner && project.githubRepoName
      ? { owner: project.githubRepoOwner, repo: project.githubRepoName }
      : parseGitHubRepo(project.repositoryUrl);
  }

  /**
   * Sincroniza em SEGUNDO PLANO (background) um chamado recém-criado/vinculado, abrindo issue no GitHub.
   */
  syncTicketToIssueInBackground(
    ticketId: number,
    projectId: number,
    protocol: string,
    title: string,
    description: string,
    requesterName: string,
    _userId?: string,
  ): void {
    // Dispara promessa sem bloquear a resposta HTTP
    void (async () => {
      try {
        const [project] = await this.db
          .select()
          .from(softwareProjects)
          .where(eq(softwareProjects.id, projectId))
          .limit(1);

        if (!project) return;

        const repoInfo =
          project.githubRepoOwner && project.githubRepoName
            ? { owner: project.githubRepoOwner, repo: project.githubRepoName }
            : parseGitHubRepo(project.repositoryUrl);

        if (!repoInfo) return;

        const issueTitle = `[${protocol}] ${title}`;
        const issueBody = `### Chamado Aberto no Azuos Ticket\n\n**Protocolo:** ${protocol}\n**Solicitante:** ${requesterName}\n\n**Descrição:**\n${description}\n\n---\n*Gerado automaticamente em segundo plano via Azuos Ticket.*`;

        const token = this.app ? await this.app.accessToken() : this.token;
        const result = await this.createIssue(
          repoInfo.owner,
          repoInfo.repo,
          issueTitle,
          issueBody,
          token,
        );

        if (result) {
          // Atualiza o chamado com o link da issue
          await this.db
            .update(tickets)
            .set({
              githubIssueNumber: result.issueNumber,
              githubIssueUrl: result.issueUrl,
            })
            .where(eq(tickets.id, ticketId));

          // Grava o evento na timeline do projeto
          await this.db.insert(softwareTimelineEvents).values({
            projectId: project.id,
            type: 'issue',
            externalId: `#${result.issueNumber}`,
            title: `Issue #${result.issueNumber} criada para o chamado ${protocol}`,
            description: title,
            url: result.issueUrl,
            author: requesterName,
            authorName: requesterName,
            status: 'open',
            eventDate: new Date(),
            createdBy: 'sistema@azuos.local',
          });

          this.logger.log(
            `Issue #${result.issueNumber} criada com sucesso para o chamado ${protocol}`,
          );
        }
      } catch (err) {
        this.logger.error(
          `Erro ao sincronizar issue em background para o chamado ${ticketId}:`,
          err,
        );
      }
    })();
  }
}

/** O merge como a tela mostra: autor, título da primeira linha e data do commit. */
function localMergeFromCommit(commit: RawGithubCommit): FetchedMerge {
  const login = commit.author?.login ?? commit.commit.author?.name ?? 'github';
  const title = commit.commit.message.split('\n')[0]?.trim() || `Merge ${commit.sha.slice(0, 7)}`;

  return {
    externalId: commit.sha.slice(0, 7),
    title,
    url: commit.html_url,
    author: login,
    authorName: login,
    status: 'merged' as const,
    eventDate: commitDate(commit),
  };
}

/** A data em que o merge entrou; sem data no commit, vale o momento da sincronização. */
function commitDate(commit: RawGithubCommit): Date {
  return new Date(commit.commit.committer?.date ?? commit.commit.author?.date ?? Date.now());
}
