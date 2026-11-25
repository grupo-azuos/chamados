/**
 * O AVISO DO GITHUB lido no formato do sistema.
 *
 * O payload do webhook é grande e cheio de campos opcionais; aqui ele vira só o que o chamados
 * usa, com os mesmos formatos da sincronização (`#42`, `open|merged|closed`, a data do merge ou
 * da abertura) — assim o aviso e a sincronização da madrugada escrevem a MESMA linha da timeline.
 */
type RawUser = { login?: string | null; type?: string | null } | null | undefined;

type RawPullRequest = {
  number: number;
  title: string;
  html_url: string;
  state: string;
  merged_at?: string | null;
  created_at: string;
  user?: RawUser;
};

type RawIssue = {
  number: number;
  title: string;
  html_url: string;
  state: string;
  state_reason?: string | null;
  created_at: string;
  closed_at?: string | null;
  user?: RawUser;
  pull_request?: unknown;
};

export type WebhookTimelineItem = {
  type: 'pr' | 'issue';
  externalId: string;
  title: string;
  url: string;
  author: string;
  status: 'open' | 'merged' | 'closed';
  eventDate: Date;
};

export type WebhookHeaders = {
  deliveryId: string | undefined;
  event: string | undefined;
  signature: string | undefined;
};

/** Um objeto do payload, ou nada — o webhook nunca confia que o campo veio. */
function objectOf(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function repositoryFullNameOf(payload: Record<string, unknown>): string | null {
  const name = objectOf(payload.repository)?.full_name;
  return typeof name === 'string' ? name : null;
}

export function senderLoginOf(payload: Record<string, unknown>): string | null {
  const login = objectOf(payload.sender)?.login;
  return typeof login === 'string' ? login : null;
}

export function actionOf(payload: Record<string, unknown>): string | null {
  return typeof payload.action === 'string' ? payload.action : null;
}

/** O PR do aviso `pull_request`, como a timeline guarda. */
export function pullRequestTimelineOf(
  payload: Record<string, unknown>,
): WebhookTimelineItem | null {
  const pr = objectOf(payload.pull_request) as RawPullRequest | null;
  if (!pr || typeof pr.number !== 'number') return null;

  return {
    type: 'pr',
    externalId: `#${pr.number}`,
    title: pr.title,
    url: pr.html_url,
    author: pr.user?.login ?? 'github',
    status: pr.merged_at ? 'merged' : pr.state === 'closed' ? 'closed' : 'open',
    eventDate: new Date(pr.merged_at ?? pr.created_at),
  };
}

/**
 * A issue do aviso `issues`. Fechada, o autor é QUEM FECHOU (o `sender` do aviso) — igual à
 * sincronização, que mostra o `closed_by`. PR também chega como issue na API do GitHub, mas não
 * pelo evento `issues`; o filtro fica por garantia.
 */
export function issueTimelineOf(payload: Record<string, unknown>): WebhookTimelineItem | null {
  const issue = objectOf(payload.issue) as RawIssue | null;
  if (!issue || typeof issue.number !== 'number' || issue.pull_request) return null;
  const isClosed = issue.state === 'closed';

  return {
    type: 'issue',
    externalId: `#${issue.number}`,
    title: issue.title,
    url: issue.html_url,
    author: (isClosed ? senderLoginOf(payload) : issue.user?.login) ?? 'github',
    status: isClosed ? 'closed' : 'open',
    eventDate: new Date(isClosed && issue.closed_at ? issue.closed_at : issue.created_at),
  };
}

/** O que a sincronia issue → chamado precisa saber do aviso `issues`. */
export function issueChangeOf(payload: Record<string, unknown>): {
  issueNumber: number;
  stateReason: string | null;
  closedAt: Date | null;
} | null {
  const issue = objectOf(payload.issue) as RawIssue | null;
  if (!issue || typeof issue.number !== 'number' || issue.pull_request) return null;

  return {
    issueNumber: issue.number,
    stateReason: issue.state_reason ?? null,
    closedAt: issue.closed_at ? new Date(issue.closed_at) : null,
  };
}
