import {
  type ProjectMapCommit,
  type ProjectMapTag,
} from '@template/shared/schemas/project-map.schema';

/**
 * ONDE CADA ITEM SE PENDURA NO GIT GRAPH do mapa do projeto — o commit onde ele fechou:
 *
 * 1. O commit MAIS NOVO cuja mensagem o cita: o PR e a issue pelo número ("Merge pull request #13",
 *    "fixes #12", "(#12)"), o chamado pelo protocolo ("CH-0040") ou pela issue dele. Com
 *    `merge --no-ff`, é o merge que trouxe o trabalho para a develop.
 * 2. Sem commit que o cite, o que FECHOU vai para a primeira VERSÃO (tag) depois de fechar: a
 *    versão fecha tudo o que entrou antes dela.
 * 3. O resto (em aberto, ou fechado sem versão depois) fica no TOPO do grafo, o commit mais novo.
 */
export type AnchorRefs = { numbers: number[]; protocols: number[]; closedAt: string | null };

export const ANCHOR_TOP = 'top';

function cites(message: string, refs: AnchorRefs): boolean {
  const byNumber = refs.numbers.some((number) =>
    new RegExp(`(^|[^\\w])#${number}(?!\\d)`).test(message),
  );
  const byProtocol = refs.protocols.some((id) =>
    new RegExp(`\\bCH-0*${id}(?!\\d)`, 'i').test(message),
  );

  return byNumber || byProtocol;
}

/** A primeira versão depois de `closedAt`: a tag do commit mais velho que é de depois. */
function tagAfter(
  closedAt: string,
  commits: readonly ProjectMapCommit[],
  tags: readonly ProjectMapTag[],
): string | null {
  const tagged = new Set(tags.map((tag) => tag.sha));
  const after = commits.filter(
    (commit) => tagged.has(commit.sha) && commit.committedAt >= closedAt,
  );

  return after.at(-1)?.sha ?? null;
}

/**
 * O commit (sha) onde o item se pendura, ou `ANCHOR_TOP`. `commits` vem do mais novo para o mais
 * velho, só os que estão no desenho.
 */
export function anchorOf(
  refs: AnchorRefs,
  commits: readonly ProjectMapCommit[],
  tags: readonly ProjectMapTag[],
): string {
  const cited = commits.find((commit) => cites(commit.message, refs));
  if (cited) return cited.sha;
  const version = refs.closedAt ? tagAfter(refs.closedAt, commits, tags) : null;

  return version ?? ANCHOR_TOP;
}
