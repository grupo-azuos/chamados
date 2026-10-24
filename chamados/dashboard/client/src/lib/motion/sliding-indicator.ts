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
    if (!active) {
      gsap.set(indicator, { opacity: 0 });
      return;
    }
    const box = node.getBoundingClientRect();
    const rect = active.getBoundingClientRect();
    const target = { opacity: 1, x: rect.left - box.left, y: rect.top - box.top, width: rect.width, height: rect.height };
    if (!isAnimated || prefersReducedMotion()) {
      gsap.set(indicator, target);
      return;
    }
    tween = gsap.to(indicator, { ...target, duration: options.durationSeconds ?? SLIDING_INDICATOR_SECONDS, ease: 'power2.out' });
  }

  snap(false);
  const frame = requestAnimationFrame(() => snap(false));
  const mutations = new MutationObserver(() => snap(true));
  mutations.observe(node, { attributes: true, subtree: true, attributeFilter: options.attributes });
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
