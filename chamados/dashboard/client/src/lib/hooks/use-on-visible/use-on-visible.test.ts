import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { onVisible } from './use-on-visible';

type Callback = (entries: Array<{ isIntersecting: boolean }>) => void;

let created: Array<{
  callback: Callback;
  observe: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
}>;
const original = window.IntersectionObserver;

beforeEach(() => {
  created = [];
  window.IntersectionObserver = class {
    observe = vi.fn();
    disconnect = vi.fn();
    constructor(callback: Callback) {
      created.push({ callback, observe: this.observe, disconnect: this.disconnect });
    }
  } as unknown as typeof IntersectionObserver;
});

afterEach(() => {
  window.IntersectionObserver = original;
});

describe('onVisible', () => {
  // feliz
  it('calls back when the element comes into view', () => {
    const callback = vi.fn();
    onVisible(document.createElement('div'), { onVisible: callback, isEnabled: true });

    created[0]?.callback([{ isIntersecting: true }]);

    expect(callback).toHaveBeenCalledOnce();
  });

  it('stops watching when it is turned off, and on destroy', () => {
    const action = onVisible(document.createElement('div'), {
      onVisible: vi.fn(),
      isEnabled: true,
    });

    action?.update?.({ onVisible: vi.fn(), isEnabled: false });

    expect(created[0]?.disconnect).toHaveBeenCalled();
    expect(created).toHaveLength(1);
  });

  // triste
  it('does not watch at all while disabled', () => {
    onVisible(document.createElement('div'), { onVisible: vi.fn(), isEnabled: false });

    expect(created).toHaveLength(0);
  });

  it('ignores entries that are not in view', () => {
    const callback = vi.fn();
    onVisible(document.createElement('div'), { onVisible: callback, isEnabled: true });

    created[0]?.callback([{ isIntersecting: false }]);

    expect(callback).not.toHaveBeenCalled();
  });
});
