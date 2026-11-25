import gsap from 'gsap';
import type { Action } from 'svelte/action';

import { prefersReducedMotion } from '$lib/motion/motion';
import { cn } from '$lib/utils/cn';

/**
 * O DESTAQUE QUE DESLIZA — a animação da barra do Acerola, no par Svelte da casca padrão.
 *
 * Em vez de o fundo do item ativo pular de um item para o outro, um único destaque escorrega até
 * a posição e o tamanho do novo ativo, reposicionado quando o atributo que marca "ativo" muda
 * dentro do container. Mesmo comportamento do `useSlidingIndicator` dos sistemas em React.
 */
export type SlidingIndicatorOptions = {
  selector: string;
  indicatorClass: string;
  attributes: string[];
  durationSeconds?: number;
};

export const SLIDING_INDICATOR_SECONDS = 0.22;

export const slidingIndicator: Action<HTMLElement, SlidingIndicatorOptions> = (node, options) => {
  const indicator = document.createElement('div');
  indicator.setAttribute('aria-hidden', 'true');
  indicator.dataset.slot = 'sliding-indicator';
  indicator.className = cn('pointer-events-none absolute top-0 left-0 -z-10 opacity-0', options.indicatorClass);
  node.classList.add('relative', 'isolate');
  node.prepend(indicator);
  let tween: gsap.core.Tween | undefined;

  function snap(isAnimated: boolean) {
    tween?.kill();
    const active = node.querySelector<HTMLElement>(options.selector);
    /* Sem ativo na lista (a tela aberta é de outra parte do menu), o destaque some E encolhe no
       topo: só invisível, ele ficava do tamanho e na altura do ativo antigo — e, lá embaixo,
       esticava a lista e deixava uma barra de rolagem num menu curto. */
    if (!active) {
      gsap.set(indicator, { opacity: 0, x: 0, y: 0, width: 0, height: 0 });
      return;
    }
    const target = targetOf(node, active);
    if (!isAnimated || prefersReducedMotion()) {
      gsap.set(indicator, target);
      return;
    }
    tween = gsap.to(indicator, { ...target, duration: options.durationSeconds ?? SLIDING_INDICATOR_SECONDS, ease: 'power2.out' });
  }

  snap(false);
  const frame = requestAnimationFrame(() => snap(false));
  const mutations = new MutationObserver(() => snap(true));
  /* `childList`: trocar a parte do menu troca a LISTA inteira, e os itens novos nascem sem
     mudar atributo nenhum — sem isto, o destaque ficava onde estava. */
  mutations.observe(node, {
    attributes: true,
    childList: true,
    subtree: true,
    attributeFilter: options.attributes,
  });
  const resize = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(() => snap(false));
  resize?.observe(node);

  return {
    destroy() {
      cancelAnimationFrame(frame);
      mutations.disconnect();
      resize?.disconnect();
      tween?.kill();
      indicator.remove();
    },
  };
};

/** Onde o destaque tem de estar: a caixa do item ativo, relativa ao container. */
export function targetOf(node: HTMLElement, active: HTMLElement) {
  /* A medida de LAYOUT, quando o container é o pai posicionado do item: ela ignora `transform`.
     Dentro de um diálogo que abre com zoom, a caixa da tela vinha encolhida no meio da animação,
     e o destaque ficava menor e deslocado para o lado da aba escolhida. */
  if (active.offsetParent === node) {
    return {
      opacity: 1,
      x: active.offsetLeft,
      y: active.offsetTop,
      width: active.offsetWidth,
      height: active.offsetHeight,
    };
  }

  /* O `absolute` conta a partir de DENTRO da borda do container, e o `getBoundingClientRect` de
     FORA dela — sem descontar a borda (`clientLeft`/`clientTop`), o destaque ficava 1px à direita
     e abaixo do item. */
  const box = node.getBoundingClientRect();
  const rect = active.getBoundingClientRect();

  return {
    opacity: 1,
    x: rect.left - box.left - node.clientLeft,
    y: rect.top - box.top - node.clientTop,
    width: rect.width,
    height: rect.height,
  };
}
