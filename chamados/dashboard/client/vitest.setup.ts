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
