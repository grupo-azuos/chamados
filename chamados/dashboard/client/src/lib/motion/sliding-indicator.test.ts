import { describe, expect, it } from 'vitest';

import { slidingIndicator, targetOf } from './sliding-indicator';

function menu(active: number) {
  const nav = document.createElement('nav');
  nav.innerHTML = ['a', 'b']
    .map((key, index) => `<a href="#${key}"${index === active ? ' aria-current="page"' : ''}>${key}</a>`)
    .join('');
  document.body.append(nav);

  return nav;
}

const options = {
  selector: '[aria-current="page"]',
  indicatorClass: 'rounded-box bg-sidebar-accent',
  attributes: ['aria-current'],
};

describe('slidingIndicator', () => {
  // feliz
  it('puts one decorative highlight behind the active item', () => {
    const nav = menu(0);
    slidingIndicator(nav, options);

    const indicators = nav.querySelectorAll('[data-slot="sliding-indicator"]');
    expect(indicators).toHaveLength(1);
    expect(indicators[0]).toHaveAttribute('aria-hidden', 'true');
    expect(nav).toHaveClass('relative', 'isolate');
  });

  // triste
  it('takes the highlight away when destroyed', () => {
    const nav = menu(1);
    const action = slidingIndicator(nav, options);

    action?.destroy?.();

    expect(nav.querySelector('[data-slot="sliding-indicator"]')).toBeNull();
  });
});

describe('slidingIndicator — sliding to the next active item', () => {
  // feliz
  it('slides the highlight when the active item changes, and snaps without motion when asked', async () => {
    const nav = menu(0);
    const matchMedia = window.matchMedia;
    window.matchMedia = ((query: string) => ({ matches: false, media: query }) as MediaQueryList) as typeof window.matchMedia;
    try {
      const action = slidingIndicator(nav, options);
      nav.querySelectorAll('a')[0]!.removeAttribute('aria-current');
      nav.querySelectorAll('a')[1]!.setAttribute('aria-current', 'page');
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(nav.querySelector('[data-slot="sliding-indicator"]')).not.toBeNull();
      (action as { destroy?: () => void })?.destroy?.();
    } finally {
      window.matchMedia = matchMedia;
      nav.remove();
    }
  });
});

describe('targetOf', () => {
  function box(rect: Partial<DOMRect>): DOMRect {
    return { left: 0, top: 0, width: 0, height: 0, ...rect } as DOMRect;
  }

  // feliz
  it('reads the layout box when the container is the positioned parent, ignoring the zoom', () => {
    const node = document.createElement('div');
    const active = document.createElement('button');
    Object.defineProperties(active, {
      offsetParent: { value: node },
      offsetLeft: { value: 40 },
      offsetTop: { value: 4 },
      offsetWidth: { value: 120 },
      offsetHeight: { value: 36 },
    });
    /* No meio do zoom a caixa da tela vem encolhida: ela não pode ser a medida. */
    active.getBoundingClientRect = () => box({ left: 999, width: 60 });

    expect(targetOf(node, active)).toEqual({ opacity: 1, x: 40, y: 4, width: 120, height: 36 });
  });

  // triste
  it('takes the container border out of the screen box, so the highlight does not sit 1px off', () => {
    const node = document.createElement('div');
    const active = document.createElement('a');
    Object.defineProperties(node, { clientLeft: { value: 1 }, clientTop: { value: 1 } });
    node.getBoundingClientRect = () => box({ left: 10, top: 20 });
    active.getBoundingClientRect = () => box({ left: 31, top: 61, width: 50, height: 40 });

    expect(targetOf(node, active)).toEqual({ opacity: 1, x: 20, y: 40, width: 50, height: 40 });
  });
});

describe('slidingIndicator — no active item', () => {
  // triste
  it('shrinks the hidden highlight to the top, so it cannot stretch a short menu', () => {
    const nav = menu(-1);
    slidingIndicator(nav, options);

    const indicator = nav.querySelector<HTMLElement>('[data-slot="sliding-indicator"]')!;
    expect(indicator.style.width).toBe('0px');
    expect(indicator.style.height).toBe('0px');
    nav.remove();
  });
});
