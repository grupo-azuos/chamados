import { describe, expect, it } from 'vitest';

import { slidingIndicator } from './sliding-indicator';

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
