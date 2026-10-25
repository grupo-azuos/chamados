import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/svelte';
import { afterEach } from 'vitest';

/**
 * Sem a limpeza, o DOM do teste anterior continua montado e uma consulta por texto
 * encontra o elemento da outra história — o teste passa por acaso e falha quando a ordem
 * dos arquivos muda.
 */
afterEach(() => {
  cleanup();
  /* O bits-ui trava a página (`pointer-events: none` no `body`) enquanto um menu ou diálogo está
     aberto, e destrava no fim da animação de fechar. Desmontado no meio dela pelo `cleanup`, ele
     deixava a página travada — e o teste SEGUINTE não conseguia clicar em nada, falhando conforme
     a ordem dos testes. A página volta destravada a cada teste. */
  document.body.style.removeProperty('pointer-events');
});

/**
 * O jsdom não implementa Pointer Events nem `scrollIntoView`. Componentes de UI (bits-ui)
 * chamam ambos ao abrir — sem o stub, o teste quebra com "is not a function" antes de testar o que importa.
 */
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
}
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {};
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {};
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

/**
 * Nem a Web Animations API (`element.animate`), que as transições do Svelte (`slide`, `scale`)
 * usam. O stub termina a animação na hora — avisando o `onfinish` —, para quem sai da tela sair
 * de verdade e o teste ver o estado final.
 */
if (!Element.prototype.animate) {
  Element.prototype.animate = function animate() {
    const animation = {
      onfinish: null as (() => void) | null,
      currentTime: 0,
      finished: Promise.resolve(),
      cancel: () => {},
      finish: () => {},
      pause: () => {},
      play: () => {},
    };
    setTimeout(() => animation.onfinish?.(), 0);

    return animation as unknown as Animation;
  };
}

/**
 * O jsdom também não implementa `matchMedia`. O `Sidebar` o consulta na montagem para
 * decidir entre a barra e a gaveta.
 */
if (!window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

/**
 * O jsdom não implementa `ResizeObserver`. A moldura dos gráficos (`AzuosEchart`) se mede
 * com ele para saber onde desenhar — sem o stub, o teste quebra antes de renderizar qualquer
 * coisa. O observador não dispara: no jsdom todo elemento tem tamanho zero de qualquer forma,
 * e o que os testes conferem é o que foi desenhado e o que é anunciado ao leitor de tela, não
 * a geometria.
 */
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  } as unknown as typeof ResizeObserver;
}

/**
 * O jsdom devolve `getClientRects()` SEMPRE vazio — num navegador, todo elemento visível tem ao
 * menos uma caixa.
 *
 * O bits-ui (popover, menu, seletor, balão) só posiciona a camada flutuante quando o gatilho tem
 * caixa: lista vazia é, para ele, "o gatilho sumiu da tela", e a camada fica escondida
 * (`visibility: hidden`) para sempre. O conteúdo existia no HTML mas não para o leitor de tela, e
 * os testes de menu, seletor de horário, data e balão quebravam todos por esse único motivo, que
 * não existe no navegador. Elemento conectado e não escondido passa a ter a caixa que o jsdom mede.
 */
const listClientRects = Element.prototype.getClientRects;

Element.prototype.getClientRects = function getClientRects(this: Element): DOMRectList {
  const rects = listClientRects.call(this);
  if (rects.length > 0 || !this.isConnected) return rects;
  if (this instanceof HTMLElement && this.hidden) return rects;

  const box = this.getBoundingClientRect();

  return Object.assign([box], {
    item: (index: number) => (index === 0 ? box : null),
  }) as unknown as DOMRectList;
};
