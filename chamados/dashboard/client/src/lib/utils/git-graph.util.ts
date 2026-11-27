import {
  type ProjectMapBranch,
  type ProjectMapCommit,
  type ProjectMapTag,
} from '@template/shared/schemas/project-map.schema';

import { type AzuosCardHue } from '$lib/utils/card-tone.util';

/**
 * O GIT GRAPH (o do lazygit) — cada commit uma linha, com as LANES à esquerda: a develop numa,
 * cada branch noutra que sai dela e volta no merge. A cor da lane é a da categoria do git-flow
 * (feature, bugfix, hotfix, release), pelo nome da branch quando se sabe, ou pelo prefixo da
 * mensagem (`[feat]`, `[fix]`...).
 *
 * "Só merges e branches" esconde os commits do meio: cada ponto que sobra liga no ancestral mais
 * perto que também sobrou, e o desenho continua contando de onde a branch saiu e onde voltou. O
 * período e a pessoa recortam do mesmo jeito.
 */
export type GitCategory =
  'main' | 'develop' | 'feature' | 'bugfix' | 'hotfix' | 'release' | 'other';

export const GIT_CATEGORY_HUES: Record<GitCategory, AzuosCardHue> = {
  main: 'green',
  develop: 'blue',
  feature: 'plum',
  bugfix: 'red',
  hotfix: 'copper',
  release: 'yellow',
  other: 'slate',
};

export const GIT_CATEGORY_LABELS: Record<GitCategory, string> = {
  main: 'main',
  develop: 'develop',
  feature: 'feature',
  bugfix: 'bugfix',
  hotfix: 'hotfix',
  release: 'release',
  other: 'outras',
};

const TRUNKS = ['develop', 'main', 'master'];

/** A altura de cada commit no desenho (uma linha de texto, como no lazygit). */
export const GIT_ROW_HEIGHT = 24;

/* O prefixo da branch (`feature/…`) e o tipo da mensagem (`[feat](web): …`, `fix: …`) → categoria. */
const BRANCH_PREFIXES: Record<string, GitCategory> = {
  main: 'main',
  master: 'main',
  develop: 'develop',
  feature: 'feature',
  feat: 'feature',
  bugfix: 'bugfix',
  fix: 'bugfix',
  hotfix: 'hotfix',
  release: 'release',
};

const MESSAGE_TYPES: Record<string, GitCategory> = {
  feat: 'feature',
  fix: 'bugfix',
  bugfix: 'bugfix',
  hotfix: 'hotfix',
  release: 'release',
  merge: 'develop',
};

export function categoryOfBranch(name: string): GitCategory {
  const prefix = TRUNKS.includes(name) ? name : (name.split('/')[0] ?? '');

  return (
    (name.includes('/') || TRUNKS.includes(name) ? BRANCH_PREFIXES[prefix] : undefined) ?? 'other'
  );
}

/** A categoria pela mensagem do commit: `[feat](web): …` é feature, `[fix]` é bugfix. */
export function categoryOfMessage(message: string): GitCategory {
  const type = /^\[([a-z]+)\]/.exec(message)?.[1] ?? /^([a-z]+)(\(.+\))?:/.exec(message)?.[1] ?? '';

  return MESSAGE_TYPES[type] ?? 'other';
}

export type GitGraphFilter = {
  from?: string;
  to?: string;
  /** A conta do GitHub da pessoa: só os commits dela. */
  personLogin?: string | null;
  isPersonFiltered?: boolean;
  onlyMerges?: boolean;
};

/** Uma ligação entre a linha de cima e a de baixo: de que lane para que lane. */
export type GitGraphLink = { from: number; to: number; hue: AzuosCardHue };

export type GitGraphRow = {
  commit: ProjectMapCommit;
  /** A lane do ponto. */
  lane: number;
  hue: AzuosCardHue;
  isMerge: boolean;
  /** As branches cuja ponta é este commit; `isNew`: apareceu há pouco (pulsa). */
  heads: { name: string; category: GitCategory; isNew: boolean }[];
  /** As versões (tags) deste commit: "v1.4.0". */
  tags: string[];
  /** As linhas que passam por cima (da linha anterior até este ponto) e por baixo (até a próxima). */
  above: GitGraphLink[];
  below: GitGraphLink[];
  /** Quantas lanes a linha usa — a largura do desenho. */
  width: number;
};

const NEW_BRANCH_HOURS = 48;

function isInPeriod(commit: ProjectMapCommit, filter: GitGraphFilter): boolean {
  const day = commit.committedAt.slice(0, 10);

  return (!filter.from || day >= filter.from) && (!filter.to || day <= filter.to);
}

function isOfPerson(commit: ProjectMapCommit, filter: GitGraphFilter): boolean {
  if (!filter.isPersonFiltered) return true;

  return (
    Boolean(filter.personLogin) &&
    commit.authorLogin?.toLowerCase() === filter.personLogin?.toLowerCase()
  );
}

function isKept(
  commit: ProjectMapCommit,
  filter: GitGraphFilter,
  heads: ReadonlySet<string>,
): boolean {
  if (!isInPeriod(commit, filter) || !isOfPerson(commit, filter)) return false;

  return !filter.onlyMerges || commit.parents.length > 1 || heads.has(commit.sha);
}

/** O ancestral mais perto que sobrou, andando pela linha de onde cada commit veio. */
function nearestKept(
  sha: string,
  bySha: ReadonlyMap<string, ProjectMapCommit>,
  kept: ReadonlySet<string>,
): string | null {
  let current: string | undefined = sha;
  for (let step = 0; current && step < 1000; step++) {
    if (kept.has(current)) return current;
    current = bySha.get(current)?.parents[0];
  }

  return null;
}

type Lane = { sha: string; hue: AzuosCardHue } | null;

type GraphContext = {
  bySha: ReadonlyMap<string, ProjectMapCommit>;
  kept: ReadonlySet<string>;
  headsBySha: ReadonlyMap<string, ProjectMapBranch[]>;
  tagsBySha: ReadonlyMap<string, string[]>;
  now: Date;
};

function headsByShaOf(branches: readonly ProjectMapBranch[]): Map<string, ProjectMapBranch[]> {
  const heads = new Map<string, ProjectMapBranch[]>();
  for (const branch of branches.filter((item) => item.headSha)) {
    heads.set(branch.headSha!, [...(heads.get(branch.headSha!) ?? []), branch]);
  }

  return heads;
}

function headsOf(commit: ProjectMapCommit, context: GraphContext): GitGraphRow['heads'] {
  return (context.headsBySha.get(commit.sha) ?? []).map((branch) => ({
    name: branch.name,
    category: categoryOfBranch(branch.name),
    isNew:
      !TRUNKS.includes(branch.name) &&
      context.now.getTime() - Date.parse(branch.firstSeenAt) < NEW_BRANCH_HOURS * 3_600_000,
  }));
}

/** Os pais que sobraram no recorte (o commit do meio que saiu é atravessado). */
function keptParents(commit: ProjectMapCommit, context: GraphContext): string[] {
  const parents = commit.parents.map((parent) => nearestKept(parent, context.bySha, context.kept));

  return [...new Set(parents.filter((sha): sha is string => sha !== null))];
}

/** A lane do commit: a que já esperava por ele, ou a primeira livre. */
function laneOf(lanes: Lane[], sha: string): number {
  const waiting = lanes.findIndex((item) => item?.sha === sha);

  return waiting < 0 ? firstFree(lanes) : waiting;
}

/** As lanes que passam por cima: as que esperavam este commit convergem no ponto. */
function linksAbove(lanes: readonly Lane[], sha: string, lane: number): GitGraphLink[] {
  return lanes.flatMap((item, index) =>
    item ? [{ from: index, to: item.sha === sha ? lane : index, hue: item.hue }] : [],
  );
}

/** Depois do commit: a lane dele segue para o primeiro pai, e cada outro pai abre uma lane. */
function advance(
  lanes: Lane[],
  sha: string,
  lane: number,
  hue: AzuosCardHue,
  parents: string[],
  context: GraphContext,
) {
  lanes.forEach((item, index) => {
    if (item?.sha === sha) lanes[index] = null;
  });
  lanes[lane] = parents[0] ? { sha: parents[0], hue } : null;
  for (const parent of parents.slice(1).filter((sha) => !lanes.some((item) => item?.sha === sha))) {
    const parentCommit = context.bySha.get(parent);
    lanes[firstFree(lanes)] = {
      sha: parent,
      hue: GIT_CATEGORY_HUES[parentCommit ? categoryOfMessage(parentCommit.message) : 'other'],
    };
  }
}

function linksBelow(lanes: readonly Lane[], lane: number, parents: string[]): GitGraphLink[] {
  return lanes.flatMap((item, index) => {
    if (!item) return [];
    const fromNode = index === lane || parents.slice(1).includes(item.sha);

    return [{ from: fromNode ? lane : index, to: index, hue: item.hue }];
  });
}

function widthOf(lane: number, above: GitGraphLink[], below: GitGraphLink[]): number {
  return Math.max(
    lane + 1,
    ...[...above, ...below].map((link) => Math.max(link.from, link.to) + 1),
  );
}

function tagsByShaOf(tags: readonly ProjectMapTag[]): Map<string, string[]> {
  const bySha = new Map<string, string[]>();
  for (const tag of tags) bySha.set(tag.sha, [...(bySha.get(tag.sha) ?? []), tag.name]);

  return bySha;
}

/**
 * As linhas do grafo, do commit mais novo para o mais velho. `commits` vem do mais novo para o mais
 * velho (como a API manda); `branches` dá o nome das pontas.
 */
export function buildGitGraph(
  commits: readonly ProjectMapCommit[],
  branches: readonly ProjectMapBranch[],
  filter: GitGraphFilter = {},
  now: Date = new Date(),
  tags: readonly ProjectMapTag[] = [],
): GitGraphRow[] {
  const headsBySha = headsByShaOf(branches);
  const tagsBySha = tagsByShaOf(tags);
  /* A ponta de branch e a versão ficam mesmo no "só merges e branches": são marcos do grafo. */
  const headShas = new Set([...headsBySha.keys(), ...tagsBySha.keys()]);
  const keptCommits = commits.filter((commit) => isKept(commit, filter, headShas));
  const context: GraphContext = {
    bySha: new Map(commits.map((commit) => [commit.sha, commit])),
    kept: new Set(keptCommits.map((commit) => commit.sha)),
    headsBySha,
    tagsBySha,
    now,
  };
  const lanes: Lane[] = [];

  return keptCommits.map((commit) => {
    const parents = keptParents(commit, context);
    const heads = headsOf(commit, context);
    const lane = laneOf(lanes, commit.sha);
    const hue = trunkHue(heads) ?? lanes[lane]?.hue ?? hueOfNew(commit, heads);
    const above = linksAbove(lanes, commit.sha, lane);
    advance(lanes, commit.sha, lane, hue, parents, context);
    const below = linksBelow(lanes, lane, parents);
    trimTail(lanes);

    return {
      commit,
      lane,
      hue,
      isMerge: commit.parents.length > 1,
      heads,
      tags: context.tagsBySha.get(commit.sha) ?? [],
      above,
      below,
      width: widthOf(lane, above, below),
    };
  });
}

function firstFree(lanes: Lane[]): number {
  const free = lanes.findIndex((lane) => lane === null);

  return free < 0 ? lanes.length : free;
}

function trimTail(lanes: Lane[]): void {
  while (lanes.length && lanes[lanes.length - 1] === null) lanes.pop();
}

/** A ponta da develop ou da main pinta a lane dela daqui para baixo, na cor da linha principal. */
function trunkHue(heads: GitGraphRow['heads']): AzuosCardHue | null {
  const trunk = heads.find((head) => TRUNKS.includes(head.name));

  return trunk ? GIT_CATEGORY_HUES[trunk.category] : null;
}

/** A cor da lane que nasce neste commit: a da branch da ponta, ou a da mensagem. */
function hueOfNew(commit: ProjectMapCommit, heads: GitGraphRow['heads']): AzuosCardHue {
  const named = heads.find((head) => !TRUNKS.includes(head.name)) ?? heads[0];

  return GIT_CATEGORY_HUES[named ? named.category : categoryOfMessage(commit.message)];
}
