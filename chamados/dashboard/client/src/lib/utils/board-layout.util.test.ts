import { type LayoutItem } from '@template/shared/schemas/dashboard-board.schema';
import { describe, expect, it } from 'vitest';

import {
  bottomPlace,
  cellAt,
  compactLayout,
  defaultSizeOf,
  moveItem,
  overlaps,
  resizeItem,
  rowsOf,
} from './board-layout.util';

const A: LayoutItem = { i: 'a', x: 0, y: 0, w: 2, h: 2 };
const B: LayoutItem = { i: 'b', x: 2, y: 0, w: 2, h: 2 };
const C: LayoutItem = { i: 'c', x: 0, y: 2, w: 4, h: 1 };

function noOverlap(layout: LayoutItem[]): boolean {
  return layout.every((item) => layout.every((other) => !overlaps(item, other)));
}

describe('board layout', () => {
  // feliz
  it('puts a new block under everything, in the size of its kind', () => {
    expect(bottomPlace([A, B, C], 'column')).toEqual({ x: 0, y: 3, w: 2, h: 2 });
    expect(defaultSizeOf('stats')).toEqual({ w: 4, h: 1 });
    expect(rowsOf([A, C])).toBe(3);
  });

  // feliz
  it('moves a block and pushes down whoever is in the way, without overlap', () => {
    const moved = moveItem([A, B, C], 'c', 0, 0);

    expect(moved.find((item) => item.i === 'c')).toMatchObject({ x: 0, y: 0 });
    expect(noOverlap(moved)).toBe(true);
    expect(moved.find((item) => item.i === 'a')!.y).toBe(1);
  });

  // feliz
  it('lifts everything up so no hole is left', () => {
    const compacted = compactLayout([{ ...A, y: 3 }, { ...B, y: 5 }]);

    expect(compacted.map((item) => item.y)).toEqual([0, 0]);
  });

  // feliz
  it('grows a block and moves down who was below it', () => {
    const resized = resizeItem([A, B, C], 'a', 2, 3);

    expect(resized.find((item) => item.i === 'a')).toMatchObject({ w: 2, h: 3 });
    expect(resized.find((item) => item.i === 'c')!.y).toBe(3);
    expect(noOverlap(resized)).toBe(true);
  });

  // triste
  it('never shrinks a block below two cells, unless it is compact', () => {
    expect(resizeItem([A], 'a', 1, 1).find((item) => item.i === 'a')).toMatchObject({ w: 1, h: 2 });
    expect(resizeItem([A], 'a', 1, 1, true).find((item) => item.i === 'a')).toMatchObject({ w: 1, h: 1 });
  });

  // triste
  it('keeps a block inside the four columns, and ignores an unknown id', () => {
    expect(moveItem([A], 'a', 9, -3).find((item) => item.i === 'a')).toMatchObject({ x: 2, y: 0 });
    expect(moveItem([A], 'z', 1, 1)).toEqual([A]);
  });

  // feliz
  it('finds the cell under the pointer', () => {
    expect(cellAt({ x: 250, y: 190 }, { width: 200, height: 160, gap: 16 })).toEqual({ x: 1, y: 1 });
    expect(cellAt({ x: 5000, y: -10 }, { width: 200, height: 160, gap: 16 })).toEqual({ x: 3, y: 0 });
  });
});
