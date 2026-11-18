import gsap from 'gsap';

import { prefersReducedMotion } from './motion';

/**
 * O hover dos cards: uma mancha que entra em círculo a partir de onde o mouse entrou e cobre o
 * card, e recolhe em direção a onde ele saiu. Animado com GSAP, só em `transform` (a placa de
 * vídeo cuida), e só o card sob o mouse anima. É uma ação do Svelte: `use:cardWash` no card, e a
 * mancha é o filho marcado com `data-slot="card-wash"`.
 *
 * Quem pediu menos movimento ao sistema vê a mancha aparecer e sumir, sem crescer.
 */

/** Diâmetro-base da mancha, em pixels; o GSAP escala a partir dele. */
export const WASH_SIZE = 10;

const GROW_SECONDS = 0.5;
const SHRINK_SECONDS = 0.35;

type Point = { x: number; y: number; scale: number };

/** Onde o mouse está dentro do card, e quanto a mancha precisa crescer para cobri-lo inteiro. */
export function washPointOf(node: HTMLElement, event: PointerEvent): Point {
  const box = node.getBoundingClientRect();
  const x = event.clientX - box.left;
  const y = event.clientY - box.top;
  const reach = Math.hypot(Math.max(x, box.width - x), Math.max(y, box.height - y));

  return { x, y, scale: (reach * 2) / WASH_SIZE + 1 };
}

export function cardWash(node: HTMLElement) {
  const washOf = () => node.querySelector<HTMLElement>('[data-slot="card-wash"]');

  const enter = (event: PointerEvent) => {
    const wash = washOf();
    if (!wash) return;

    const point = washPointOf(node, event);
    gsap.killTweensOf(wash);
    gsap.set(wash, { left: point.x, top: point.y });
    if (prefersReducedMotion()) {
      gsap.set(wash, { scale: point.scale });
      return;
    }

    gsap.fromTo(
      wash,
      { scale: 0 },
      { scale: point.scale, duration: GROW_SECONDS, ease: 'power2.out' },
    );
  };

  const leave = (event: PointerEvent) => {
    const wash = washOf();
    if (!wash) return;

    const point = washPointOf(node, event);
    gsap.killTweensOf(wash);
    if (prefersReducedMotion()) {
      gsap.set(wash, { scale: 0 });
      return;
    }

    gsap.to(wash, {
      left: point.x,
      top: point.y,
      scale: 0,
      duration: SHRINK_SECONDS,
      ease: 'power2.in',
    });
  };

  node.addEventListener('pointerenter', enter);
  node.addEventListener('pointerleave', leave);

  return {
    destroy() {
      node.removeEventListener('pointerenter', enter);
      node.removeEventListener('pointerleave', leave);
    },
  };
}
