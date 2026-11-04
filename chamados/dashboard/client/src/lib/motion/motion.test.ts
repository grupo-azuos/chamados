import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('gsap', () => ({ default: { from: vi.fn(), fromTo: vi.fn(), to: vi.fn() } }));

const { default: gsap } = await import('gsap');
const { countTo, fadeInUp, highlightIn, popIn, prefersReducedMotion, staggerIn } = await import('./motion');

/** O que o sistema operacional diz sobre "reduzir movimento". */
function stubMotionPreference(reduce: boolean) {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) => ({ matches: reduce, media: query }) as MediaQueryList,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.mocked(gsap.from).mockClear();
  vi.mocked(gsap.fromTo).mockClear();
  vi.mocked(gsap.to).mockClear();
});

describe('prefersReducedMotion', () => {
  // feliz
  it('reads the preference from the browser', () => {
    stubMotionPreference(true);
    expect(prefersReducedMotion()).toBe(true);
  });

  // triste
  it('assumes motion is fine where the browser cannot be asked', () => {
    vi.stubGlobal('matchMedia', undefined);
    try {
      expect(prefersReducedMotion()).toBe(false);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('entrances', () => {
  // feliz
  it('fades, staggers and pops with the shared duration and ease', () => {
    stubMotionPreference(false);
    const target = document.createElement('div');

    fadeInUp(target, { delay: 0.1 });
    staggerIn([target]);
    popIn(target);

    expect(gsap.from).toHaveBeenCalledWith(target, expect.objectContaining({ y: 12, delay: 0.1 }));
    expect(gsap.from).toHaveBeenCalledWith([target], expect.objectContaining({ stagger: 0.05, delay: 0 }));
    expect(gsap.fromTo).toHaveBeenCalledWith(target, { scale: 0.7 }, expect.objectContaining({ scale: 1 }));
  });

  // triste
  it('does not move anything when the person asked for less motion', () => {
    stubMotionPreference(true);
    const target = document.createElement('div');

    fadeInUp(target);
    staggerIn(target);
    popIn(target);
    highlightIn(target, { color: 'red' });

    expect(gsap.from).not.toHaveBeenCalled();
    expect(gsap.fromTo).not.toHaveBeenCalled();
  });
});

describe('highlightIn', () => {
  // feliz
  it('fades the background in with the given color, or the sidebar accent by default', () => {
    stubMotionPreference(false);
    const target = document.createElement('div');
    document.documentElement.style.setProperty('--sidebar-accent', ' rgb(1, 2, 3) ');

    highlightIn(target, { color: 'rgb(9, 9, 9)', delay: 0.2 });
    expect(gsap.fromTo).toHaveBeenLastCalledWith(
      target,
      { backgroundColor: 'transparent' },
      expect.objectContaining({ backgroundColor: 'rgb(9, 9, 9)', delay: 0.2 }),
    );

    highlightIn(target);
    expect(gsap.fromTo).toHaveBeenLastCalledWith(
      target,
      { backgroundColor: 'transparent' },
      expect.objectContaining({ backgroundColor: 'rgb(1, 2, 3)', delay: 0 }),
    );
  });

  // triste
  it('ignores a missing target', () => {
    stubMotionPreference(false);
    highlightIn(null);
    expect(gsap.fromTo).not.toHaveBeenCalled();
  });
});

describe('countTo', () => {
  // feliz
  it('counts up and always ends on the exact value', () => {
    stubMotionPreference(false);
    const element = document.createElement('span');

    countTo(element, 23);

    const [counter, options] = vi.mocked(gsap.to).mock.calls[0] as [
      { current: number },
      { onUpdate: () => void; onComplete: () => void },
    ];
    counter.current = 12.6;
    options.onUpdate();
    expect(element.textContent).toBe('13');
    options.onComplete();
    expect(element.textContent).toBe('23');
  });

  // triste
  it('writes the value straight away with less motion, and ignores a missing element', () => {
    stubMotionPreference(true);
    const element = document.createElement('span');

    countTo(element, 7);
    countTo(null, 7);

    expect(element.textContent).toBe('7');
    expect(gsap.to).not.toHaveBeenCalled();
  });
});
