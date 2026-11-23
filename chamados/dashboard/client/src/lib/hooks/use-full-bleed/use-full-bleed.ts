/**
 * ESTICA UM BLOCO ATÉ AS BORDAS DA ÁREA DE CONTEÚDO, passando por cima da largura da moldura. O
 * mesmo `useFullBleed` do paralegal, no jeito do Svelte: um anexo (`{@attach fullBleed()}`) que
 * mede e escreve o estilo direto no elemento.
 *
 * A casca padrão limita toda tela a 1600px (`page-frame`), e isso é certo para texto e tabela.
 * Um quadro que rola de lado (o Kanban) é o contrário: quanto mais tela, mais colunas devem caber.
 * Em vez de mexer na casca — que é igual nos 13 sistemas —, o bloco mede a caixa que rola a tela
 * (dentro de `[data-slot="sidebar-inset"]`) e se estende até ela, com a mesma folga das laterais.
 *
 * Com `isHeightFitted`, a altura também se ajusta: o bloco vai de onde está até o pé da tela.
 * O quadro com colunas compridas rolava a PÁGINA para baixo, e a barra de rolagem de lado ficava
 * lá no fim — quem arrastava um cartão de baixo não alcançava as colunas da direita. Com altura
 * de tela, cada coluna rola por dentro e a barra de lado fica sempre à vista.
 *
 * Fora da casca (teste, história) não há o que medir: o bloco fica do tamanho de sempre.
 */
export type FullBleedStyle = { marginLeft?: number; width?: number; height?: number };

export function fullBleed(gutter = 24, options: { isHeightFitted?: boolean } = {}) {
  const { isHeightFitted = false } = options;

  return (element: HTMLElement): (() => void) | undefined => {
    const inset = element.closest<HTMLElement>('[data-slot="sidebar-inset"]');
    const parent = element.parentElement;
    if (!inset || !parent) return undefined;
    const scroller = scrollerOf(parent, inset);

    const measure = () => {
      const bleed = bleedStyle(clientBox(scroller), parent.getBoundingClientRect(), gutter);
      if (!isHeightFitted) return applyStyle(element, bleed);
      const top =
        element.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
      applyStyle(element, { ...bleed, height: fittedHeight(scroller.clientHeight, top, gutter) });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(scroller);
    observer.observe(parent);

    return () => observer.disconnect();
  };
}

/** Escreve só o que foi medido; o que não veio volta ao tamanho de sempre. */
export function applyStyle(element: HTMLElement, style: FullBleedStyle): void {
  element.style.marginLeft = style.marginLeft === undefined ? '' : `${style.marginLeft}px`;
  element.style.width = style.width === undefined ? '' : `${style.width}px`;
  element.style.height = style.height === undefined ? '' : `${style.height}px`;
}

/** Abaixo disto o quadro não encolhe: em tela baixa, mais vale rolar a página do que a coluna. */
const MIN_FITTED_HEIGHT = 480;

/**
 * A altura que leva o bloco do lugar dele (`top`, medido no conteúdo que rola) até o pé da área
 * visível, deixando a folga embaixo.
 */
export function fittedHeight(viewHeight: number, top: number, gutter: number): number {
  return Math.max(MIN_FITTED_HEIGHT, viewHeight - top - gutter);
}

type Box = Pick<DOMRect, 'left' | 'width'>;

/**
 * A caixa que rola a tela: o primeiro ancestral com rolagem vertical, até a área de conteúdo.
 * É ela que ganha a barra de rolagem de lado quando algo passa da borda.
 */
export function scrollerOf(start: HTMLElement, limit: HTMLElement): HTMLElement {
  for (let node: HTMLElement | null = start; node && node !== limit; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if (overflowY === 'auto' || overflowY === 'scroll') return node;
  }

  return limit;
}

/**
 * O miolo visível da caixa que rola, sem a barra de rolagem. A largura de dentro (`clientWidth`)
 * não cresce com o conteúdo — medir a caixa de fora fazia o quadro esticar a área, que esticava o
 * quadro de novo, e a tela ganhava rolagem de lado.
 */
export function clientBox(
  element: Pick<HTMLElement, 'clientLeft' | 'clientWidth' | 'getBoundingClientRect'>,
): Box {
  return {
    left: element.getBoundingClientRect().left + element.clientLeft,
    width: element.clientWidth,
  };
}

/**
 * Quanto o bloco anda para a esquerda e qual largura ganha: da borda da área, com a folga, até a
 * outra borda. Nunca encolhe — numa tela menor que a moldura, fica onde já estava.
 */
export function bleedStyle(area: Box, parent: Box, gutter: number): FullBleedStyle {
  const width = area.width - gutter * 2;
  if (width <= parent.width) return {};

  return { marginLeft: area.left + gutter - parent.left, width };
}
