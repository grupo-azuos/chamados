import { describe, expect, it } from 'vitest';

import {
  assertIsImageFile,
  AvatarImageError,
  base64ByteLength,
  outputEdge,
  readDataUrl,
  rotatedBoundingBox,
} from './avatar-image.util';

describe('rotatedBoundingBox', () => {
  // feliz
  it('keeps the size when there is no rotation, or a half turn', () => {
    expect(rotatedBoundingBox(400, 300, 0)).toEqual({ width: 400, height: 300 });
    expect(rotatedBoundingBox(400, 300, 180)).toEqual({ width: 400, height: 300 });
  });

  /* O celular deitado: a foto de 4:3 vira 3:4, e a área escolhida é medida nessa caixa. */
  it('swaps width and height on a quarter turn', () => {
    expect(rotatedBoundingBox(400, 300, 90)).toEqual({ width: 300, height: 400 });
    expect(rotatedBoundingBox(400, 300, 270)).toEqual({ width: 300, height: 400 });
  });

  it('grows the box on a diagonal rotation, so no corner is cut', () => {
    const box = rotatedBoundingBox(100, 100, 45);

    expect(box.width).toBe(141);
    expect(box.height).toBe(141);
  });
});

describe('outputEdge', () => {
  // feliz
  it('reduces a large selection to the avatar edge', () => {
    expect(outputEdge({ x: 0, y: 0, width: 1800, height: 1800 })).toBe(256);
  });

  // triste
  /* Aumentar uma foto pequena só a deixaria borrada e mais pesada. */
  it('never enlarges a selection smaller than the avatar edge', () => {
    expect(outputEdge({ x: 10, y: 10, width: 180.4, height: 180.4 })).toBe(180);
  });
});

describe('readDataUrl', () => {
  // feliz
  it('splits the type and the base64', () => {
    expect(readDataUrl('data:image/webp;base64,UklGRg==')).toEqual({
      contentType: 'image/webp',
      data: 'UklGRg==',
    });
  });

  /* O navegador que não gera WebP devolve PNG calado — o tipo precisa vir do resultado. */
  it('reports the type the browser actually produced', () => {
    expect(readDataUrl('data:image/png;base64,iVBORw0K')?.contentType).toBe('image/png');
  });

  // triste
  it('refuses a type the server would refuse', () => {
    expect(readDataUrl('data:image/gif;base64,R0lGOD')).toBeNull();
    expect(readDataUrl('data:,')).toBeNull();
    expect(readDataUrl('not a data url')).toBeNull();
  });
});

describe('base64ByteLength', () => {
  // feliz
  it('counts the decoded bytes, padding included', () => {
    expect(base64ByteLength(btoa('abc'))).toBe(3);
    expect(base64ByteLength(btoa('ab'))).toBe(2);
    expect(base64ByteLength(btoa('a'))).toBe(1);
  });
});

describe('assertIsImageFile', () => {
  // feliz
  it('accepts an image', () => {
    expect(() => assertIsImageFile({ type: 'image/jpeg' })).not.toThrow();
  });

  // triste
  it('refuses anything else with a message the screen can show', () => {
    expect(() => assertIsImageFile({ type: 'application/pdf' })).toThrow(AvatarImageError);
    expect(() => assertIsImageFile({ type: '' })).toThrow(/arquivo de imagem/);
  });
});
