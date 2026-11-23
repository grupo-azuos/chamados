/**
 * A PILHA DE NAVEGAÇÃO — o caminho que a pessoa fez dentro do sistema, para o "voltar" saber
 * sempre para onde levar.
 *
 * O voltar de cada ficha levava a um lugar fixo: o chamado aberto a partir da ficha da máquina
 * voltava para a fila, e a pessoa perdia a máquina que estava olhando. Aqui cada tela aberta
 * guarda a pilha inteira de onde a pessoa passou.
 *
 * As regras, todas puras (o hook `use-navigation-stack` só as aplica):
 * - abrir outra tela empilha a atual;
 * - mudar só filtro ou aba (o mesmo caminho) não empilha;
 * - chegar a uma tela do menu zera a pilha — ela é o começo de um caminho;
 * - voltar a uma tela que já está na pilha corta a pilha nela, sem crescer em círculo.
 */

/** Uma tela por onde a pessoa passou: o endereço inteiro, o nome que o "voltar" mostra e a
 *  posição dela no histórico do navegador (para voltar pelo próprio navegador quando dá). */
export type NavigationEntry = {
  href: string;
  pathname: string;
  label: string;
  index: number | null;
};

/** O teto da pilha: caminho mais fundo que isso não acontece, e a pilha não cresce sem fim. */
export const MAX_STACK_DEPTH = 12;

/** Os três módulos têm as mesmas telas com nomes iguais: o começo do endereço é o módulo. */
const MODULE = '^\\/(?:infra|system|maintenance)';

/**
 * Como o "voltar" chama cada tela, pelo começo do endereço. A ordem importa: o mais específico
 * primeiro (`/infra/tickets/<id>` antes de `/infra/tickets`).
 */
const PATH_LABELS: [RegExp, string][] = [
  [new RegExp(`${MODULE}\\/tickets\\/[^/]+`), 'o chamado'],
  [new RegExp(`${MODULE}\\/tickets\\/?$`), 'os chamados'],
  [/^\/infra\/computers\/[^/]+/, 'a máquina'],
  [/^\/infra\/computers\/?$/, 'o inventário'],
  [/^\/system\/projects\/[^/]+/, 'o projeto'],
  [/^\/system\/projects\/?$/, 'os projetos'],
  [new RegExp(`${MODULE}\\/dashboard`), 'o painel'],
  [/^\/infra\/maintenance/, 'as manutenções'],
  [/^\/infra\/parts/, 'o depósito'],
  [/^\/maintenance\/stock/, 'o depósito'],
  [new RegExp(`${MODULE}\\/disposal`), 'o descarte'],
  [/^\/infra\/network/, 'a rede'],
  [/^\/infra\/budget/, 'o orçamento'],
  [/^\/maintenance\/inventory/, 'o inventário'],
  [/^\/maintenance\/quotes/, 'os orçamentos'],
  [/^\/system\/schedule/, 'o cronograma'],
  [new RegExp(`${MODULE}\\/agent`), 'o agente'],
  [/^\/profile/, 'o perfil'],
  [/^\/roles/, 'os cargos'],
];

const FALLBACK_LABEL = 'a tela anterior';

export function pathLabelOf(pathname: string): string {
  return PATH_LABELS.find(([pattern]) => pattern.test(pathname))?.[1] ?? FALLBACK_LABEL;
}

/** Sem a barra do fim: `/infra/tickets/` e `/infra/tickets` são a mesma tela. */
function samePath(left: string, right: string): boolean {
  return left.replace(/\/+$/, '') === right.replace(/\/+$/, '');
}

/**
 * A pilha da tela que acaba de abrir, a partir da pilha da tela de onde a pessoa saiu.
 * `from` nulo é a primeira tela da aba (link colado, favorito): ela não tem de onde voltar.
 */
export function nextStack(
  stack: readonly NavigationEntry[],
  from: NavigationEntry | null,
  toPathname: string,
  roots: readonly string[],
): NavigationEntry[] {
  if (!from) return [];
  if (roots.some((root) => samePath(root, toPathname))) return [];
  /* Filtro, aba ou página da mesma tela: o caminho é o mesmo, e o voltar também. */
  if (samePath(from.pathname, toPathname)) return [...stack];
  /* Voltou a uma tela que já estava no caminho: a pilha volta a ser a de quando ela abriu. */
  const seen = stack.findIndex((entry) => samePath(entry.pathname, toPathname));
  if (seen >= 0) return stack.slice(0, seen);

  return [...stack, from].slice(-MAX_STACK_DEPTH);
}

/** O topo da pilha: para onde o "voltar" leva. */
export function backEntryOf(stack: readonly NavigationEntry[]): NavigationEntry | null {
  return stack.at(-1) ?? null;
}

/** Lê uma pilha guardada sem confiar nela: o que não tem a forma certa é descartado. */
export function parseStack(value: unknown): NavigationEntry[] {
  if (!Array.isArray(value)) return [];

  return value.filter(isEntry);
}

function isEntry(value: unknown): value is NavigationEntry {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Record<string, unknown>;

  return (
    typeof entry.href === 'string' &&
    typeof entry.pathname === 'string' &&
    typeof entry.label === 'string' &&
    (entry.index === null || typeof entry.index === 'number')
  );
}
