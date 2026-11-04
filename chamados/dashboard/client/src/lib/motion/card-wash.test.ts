import gsap from 'gsap';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { cardWash, washPointOf } from './card-wash';

afterEach(() => vi.restoreAllMocks());

/** Um card de 100x50 na origem, com a mancha dentro. */
function cardWithWash() {
  const node = document.createElement('div');
  node.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 50 }) as DOMRect;
  const wash = document.createElement('span');
  wash.dataset.slot = 'card-wash';
  node.append(wash);

  return { node, wash };
}

const pointer = (type: string, x: number, y: number) =>
  new PointerEvent(type, { clientX: x, clientY: y });

describe('cardWash', () => {
  // feliz
  it('grows the wash from the pointer and shrinks it towards where it left', () => {
    const fromTo = vi.spyOn(gsap, 'fromTo');
    const to = vi.spyOn(gsap, 'to');
    const { node } = cardWithWash();
    const action = cardWash(node);

    node.dispatchEvent(pointer('pointerenter', 10, 10));
    node.dispatchEvent(pointer('pointerleave', 90, 40));

    expect(fromTo).toHaveBeenCalledOnce();
    expect(to).toHaveBeenCalledWith(
      expect.any(HTMLSpanElement),
      expect.objectContaining({ left: 90, top: 40, scale: 0 }),
    );
    action.destroy();
  });

  it('measures how far the wash must grow to cover the card', () => {
    const { node } = cardWithWash();

    expect(washPointOf(node, pointer('pointerenter', 0, 0))).toEqual({
      x: 0,
      y: 0,
      scale: (Math.hypot(100, 50) * 2) / 10 + 1,
    });
  });

  // triste
  it('shows and hides without growing when motion is reduced, and stops listening when destroyed', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);
    const fromTo = vi.spyOn(gsap, 'fromTo');
    const { node } = cardWithWash();
    const action = cardWash(node);

    node.dispatchEvent(pointer('pointerenter', 1, 1));
    node.dispatchEvent(pointer('pointerleave', 1, 1));
    expect(fromTo).not.toHaveBeenCalled();

    action.destroy();
    vi.restoreAllMocks();
    const after = vi.spyOn(gsap, 'fromTo');
    node.dispatchEvent(pointer('pointerenter', 1, 1));
    expect(after).not.toHaveBeenCalled();
  });

  it('does nothing on a card without the wash', () => {
    const fromTo = vi.spyOn(gsap, 'fromTo');
    const node = document.createElement('div');
    cardWash(node);

    node.dispatchEvent(pointer('pointerenter', 1, 1));
    node.dispatchEvent(pointer('pointerleave', 1, 1));

    expect(fromTo).not.toHaveBeenCalled();
  });
});
