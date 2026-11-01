import tokensCss from '../theme/tokens.css?raw';

/**
 * AS CORES DO `tokens.css`, LIDAS DO PRÓPRIO ARQUIVO.
 *
 * Todo código `.ts` que precisa de uma cor pronta — o mapa de cor dos gráficos, a paleta
 * sugerida para empresas, o tema do ECharts — passa por aqui. Antes, cada um deles tinha um
 * hex "de reserva" escrito à mão para quando não há navegador (teste, servidor), e essa reserva
 * era uma segunda fonte de verdade que descolava da primeira sem ninguém ver. A reserva agora
 * é o próprio `tokens.css`: cor nova entra lá, e só lá.
 *
 * O que se lê é o tema CLARO (o primeiro bloco `:root`). No navegador o tema ativo manda —
 * ver `resolveColor` em `echarts.util.ts`, que pergunta ao `getComputedStyle` antes de cair aqui.
 */
/* Sem comentários: o cabeçalho do arquivo cita o seletor do escuro antes de qualquer token. */
const WITHOUT_COMMENTS = tokensCss.replace(/\/\*[\s\S]*?\*\//g, '');
const DARK_BLOCK = WITHOUT_COMMENTS.search(/^:root\[data-theme='dark'\]\s*\{/m);
const LIGHT_CSS = DARK_BLOCK === -1 ? WITHOUT_COMMENTS : WITHOUT_COMMENTS.slice(0, DARK_BLOCK);

/* Em CSS a última declaração vence; o mapa guarda a última de cada nome, pelo mesmo motivo. */
const DECLARED = new Map<string, string>();
for (const match of LIGHT_CSS.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
  DECLARED.set(match[1]!, match[2]!.trim());
}

const MAX_HOPS = 10;

/** `var(--a)` → `var(--b)` → `#hex`: segue a cadeia até a cor escrita. */
function follow(value: string, hops = 0): string {
  const reference = /^var\((--[\w-]+)\)$/.exec(value);
  if (!reference) return value;
  if (hops >= MAX_HOPS) throw new Error(`Token de cor em ciclo: ${value}`);

  const next = DECLARED.get(reference[1]!);
  if (next === undefined) throw new Error(`Token de cor desconhecido: ${reference[1]}`);

  return follow(next, hops + 1);
}

/** Aceita `--chart-1`, `chart-1` ou `var(--chart-1)`. */
function nameOf(token: string): string {
  const inVar = /^var\((--[\w-]+)\)$/.exec(token.trim());
  if (inVar) return inVar[1]!;

  return token.startsWith('--') ? token : `--${token}`;
}

/** O token existe no `tokens.css`? */
export function hasThemeColor(token: string): boolean {
  return DECLARED.has(nameOf(token));
}

/** A cor do tema claro de um token, já resolvida até o valor escrito (`#2e52b8`). */
export function themeColor(token: string): string {
  const name = nameOf(token);
  const declared = DECLARED.get(name);
  if (declared === undefined) throw new Error(`Token de cor desconhecido: ${name}`);

  return follow(declared);
}
