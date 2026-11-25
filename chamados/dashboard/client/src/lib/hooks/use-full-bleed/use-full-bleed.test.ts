import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { applyStyle, bleedStyle, clientBox, fittedHeight, fullBleed, scrollerOf } from './use-full-bleed';

describe('bleedStyle', () => {
  // feliz
  /* Monitor largo: a moldura para em 1600px e o quadro vai até as bordas da área. */
  it('stretches the block to the content area edges, keeping the gutter', () => {
    expect(bleedStyle({ left: 300, width: 2400 }, { left: 700, width: 1600 }, 24)).toEqual({
      marginLeft: -376,
      width: 2352,
    });
  });

  // triste
  /* Tela menor que a moldura: nada a esticar. */
  it('leaves the block alone when the frame already fills the area', () => {
    expect(bleedStyle({ left: 300, width: 1200 }, { left: 324, width: 1152 }, 24)).toEqual({});
  });
});

describe('clientBox', () => {
  // feliz
  it('measures the inner box, without border and scrollbar', () => {
    const box = clientBox({
      clientLeft: 1,
      clientWidth: 1580,
      getBoundingClientRect: () => ({ left: 300 }) as DOMRect,
    });

    expect(box).toEqual({ left: 301, width: 1580 });
  });
});

describe('scrollerOf', () => {
  // feliz
  it('finds the first ancestor that scrolls', () => {
    const limit = document.createElement('div');
    const scroller = document.createElement('div');
    scroller.style.overflowY = 'auto';
    const parent = document.createElement('div');
    limit.append(scroller);
    scroller.append(parent);

    expect(scrollerOf(parent, limit)).toBe(scroller);
  });

  // triste
  it('falls back to the content area when nothing scrolls', () => {
    const limit = document.createElement('div');
    const parent = document.createElement('div');
    limit.append(parent);

    expect(scrollerOf(parent, limit)).toBe(limit);
  });
});

describe('fittedHeight', () => {
  // feliz
  it('takes the block from where it is down to the bottom of the view', () => {
    expect(fittedHeight(1000, 300, 24)).toBe(676);
  });

  // triste
  it('never shrinks the block below the minimum on a short screen', () => {
    expect(fittedHeight(600, 400, 24)).toBe(480);
  });
});

describe('fullBleed', () => {
  const original = window.ResizeObserver;
  const disconnect = vi.fn();

  beforeEach(() => {
    window.ResizeObserver = class {
      observe = vi.fn();
      disconnect = disconnect;
    } as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    window.ResizeObserver = original;
    document.body.innerHTML = '';
  });

  // feliz
  it('fits the height inside the app shell and stops watching on destroy', () => {
    const inset = document.createElement('div');
    inset.dataset.slot = 'sidebar-inset';
    const parent = document.createElement('div');
    const board = document.createElement('div');
    parent.append(board);
    inset.append(parent);
    document.body.append(inset);

    const cleanup = fullBleed(24, { isHeightFitted: true })(board);

    /* No jsdom tudo mede zero: a altura fica no mínimo, e a largura não estica. */
    expect(board.style.height).toBe('480px');
    expect(board.style.width).toBe('');
    cleanup?.();
    expect(disconnect).toHaveBeenCalled();
  });

  it('makes a board that lives far down the page as tall as the visible area', () => {
    const inset = document.createElement('div');
    inset.dataset.slot = 'sidebar-inset';
    Object.defineProperty(inset, 'clientHeight', { value: 1000 });
    const parent = document.createElement('div');
    const board = document.createElement('div');
    parent.append(board);
    inset.append(parent);
    document.body.append(inset);

    fullBleed(24, { isHeightFitted: true, isScreenTall: true })(board);

    /* A tela de 1000px menos a folga de cima e a de baixo — não importa onde o quadro começa. */
    expect(board.style.height).toBe('952px');
  });

  // triste
  it('does nothing outside the app shell', () => {
    const board = document.createElement('div');
    document.body.append(board);

    expect(fullBleed()(board)).toBeUndefined();
    expect(board.getAttribute('style')).toBeNull();
  });

  it('clears what was written when nothing is measured', () => {
    const board = document.createElement('div');
    applyStyle(board, { marginLeft: -10, width: 900, height: 600 });
    applyStyle(board, {});

    expect(board.style.marginLeft).toBe('');
    expect(board.style.height).toBe('');
  });
});
