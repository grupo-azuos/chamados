import { describe, expect, it, vi } from 'vitest';

import {
  assertIsImageFile,
  AvatarImageError,
  base64ByteLength,
  outputEdge,
  readDataUrl,
  rotatedBoundingBox,
  rotateImageUrl,
  toCroppedAvatarUpload,
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

/**
 * O jsdom não desenha: o `<canvas>` e o `createImageBitmap` são fingidos aqui, só com o que
 * as duas funções de costura tocam. O que se prova é a ORDEM — girar, cortar, medir — e o que
 * cada falha do navegador vira para a pessoa.
 */
function fakeCanvasWorld(options: { dataUrl?: string; blob?: Blob | null; context?: boolean } = {}) {
  const drawn: unknown[][] = [];
  const context = {
    translate: () => {},
    rotate: () => {},
    drawImage: (...args: unknown[]) => drawn.push(args),
  };
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => (options.context === false ? null : context),
    toDataURL: () => options.dataUrl ?? 'data:image/webp;base64,AAAA',
    toBlob: (callback: (blob: Blob | null) => void) =>
      callback(options.blob === undefined ? new Blob(['x']) : options.blob),
  };
  const createElement = document.createElement.bind(document);
  const spy = vi
    .spyOn(document, 'createElement')
    .mockImplementation((tag: string) =>
      tag === 'canvas' ? (canvas as unknown as HTMLElement) : createElement(tag),
    );
  const bitmap = { width: 400, height: 200, close: vi.fn() };
  vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(bitmap));
  vi.stubGlobal('URL', { ...URL, createObjectURL: () => 'blob:girada' });

  return { drawn, bitmap, restore: () => (spy.mockRestore(), vi.unstubAllGlobals()) };
}

describe('toCroppedAvatarUpload', () => {
  // feliz
  it('rotates, cuts the chosen area and reads the type the browser produced', async () => {
    const world = fakeCanvasWorld();
    try {
      const upload = await toCroppedAvatarUpload(new File(['x'], 'eu.png', { type: 'image/png' }), {
        area: { x: 10, y: 20, width: 100, height: 100 },
        rotation: 90,
      });

      expect(upload).toEqual({ contentType: 'image/webp', data: 'AAAA' });
      /* Primeiro a imagem inteira girada; depois o corte, do tamanho que a pessoa escolheu. */
      expect(world.drawn).toHaveLength(2);
      expect(world.drawn[1]?.slice(1, 5)).toEqual([10, 20, 100, 100]);
      expect(world.bitmap.close).toHaveBeenCalled();
    } finally {
      world.restore();
    }
  });

  // triste
  it('refuses what is not an image before touching the browser', async () => {
    const world = fakeCanvasWorld();
    try {
      await expect(
        toCroppedAvatarUpload(new File(['x'], 'nota.pdf', { type: 'application/pdf' }), {
          area: { x: 0, y: 0, width: 10, height: 10 },
          rotation: 0,
        }),
      ).rejects.toThrow(AvatarImageError);
      expect(createImageBitmap).not.toHaveBeenCalled();
    } finally {
      world.restore();
    }
  });

  it('explains when the browser cannot open, draw or shrink the image', async () => {
    const selection = { area: { x: 0, y: 0, width: 10, height: 10 }, rotation: 0 };
    const image = () => new File(['x'], 'eu.png', { type: 'image/png' });

    const unreadable = fakeCanvasWorld();
    vi.mocked(createImageBitmap).mockRejectedValue(new Error('decode'));
    await expect(toCroppedAvatarUpload(image(), selection)).rejects.toThrow('Não consegui abrir');
    unreadable.restore();

    const noContext = fakeCanvasWorld({ context: false });
    await expect(toCroppedAvatarUpload(image(), selection)).rejects.toThrow('não conseguiu preparar');
    noContext.restore();

    const badType = fakeCanvasWorld({ dataUrl: 'data:image/gif;base64,AAAA' });
    await expect(toCroppedAvatarUpload(image(), selection)).rejects.toThrow('não conseguiu preparar');
    badType.restore();

    const tooBig = fakeCanvasWorld({ dataUrl: `data:image/png;base64,${'A'.repeat(1_400_000)}` });
    await expect(toCroppedAvatarUpload(image(), selection)).rejects.toThrow('maior que 1 MB');
    tooBig.restore();
  });
});

describe('rotateImageUrl', () => {
  // feliz
  it('hands back a blob address of the rotated image', async () => {
    const world = fakeCanvasWorld();
    const originalImage = globalThis.Image;
    class FakeImage {
      width = 10;
      height = 20;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    }
    vi.stubGlobal('Image', FakeImage);
    try {
      await expect(rotateImageUrl('blob:original', 90)).resolves.toBe('blob:girada');
    } finally {
      vi.stubGlobal('Image', originalImage);
      world.restore();
    }
  });

  // triste
  it('explains when the image cannot be loaded or the rotation cannot be saved', async () => {
    class BrokenImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        queueMicrotask(() => this.onerror?.());
      }
    }
    const originalImage = globalThis.Image;
    const world = fakeCanvasWorld({ blob: null });
    vi.stubGlobal('Image', BrokenImage);
    try {
      await expect(rotateImageUrl('blob:x', 0)).rejects.toThrow('Não consegui abrir');

      class LoadingImage extends BrokenImage {
        width = 10;
        height = 10;
        override set src(_value: string) {
          queueMicrotask(() => this.onload?.());
        }
      }
      vi.stubGlobal('Image', LoadingImage);
      await expect(rotateImageUrl('blob:x', 0)).rejects.toThrow('não conseguiu girar');
    } finally {
      vi.stubGlobal('Image', originalImage);
      world.restore();
    }
  });
});
