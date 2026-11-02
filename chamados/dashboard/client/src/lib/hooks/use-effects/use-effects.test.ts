import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const STORAGE_KEY = 'azuos-effects';

/** O estado mora em `$state` de escopo de módulo — cada teste precisa de um módulo novo. */
async function freshEffects() {
  vi.resetModules();

  return import('./use-effects.svelte');
}

function stubCores(cores: number) {
  vi.stubGlobal('navigator', { hardwareConcurrency: cores });
}

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute('data-effects');
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useEffectsModel', () => {
  // feliz
  it('starts with full effects on a capable machine and tells the page', async () => {
    stubCores(8);
    const { useEffectsModel } = await freshEffects();

    expect(useEffectsModel().level).toBe('full');
    expect(useEffectsModel().isAutomatic).toBe(true);
    expect(document.documentElement.getAttribute('data-effects')).toBe('full');
  });

  it('starts light on a modest machine', async () => {
    stubCores(2);
    const { useEffectsModel } = await freshEffects();

    expect(useEffectsModel().level).toBe('lite');
    expect(document.documentElement.getAttribute('data-effects')).toBe('lite');
  });

  it('lets the person switch, saves the choice and stops deciding alone', async () => {
    stubCores(8);
    const { useEffectsModel } = await freshEffects();
    const effects = useEffectsModel();

    effects.actions.onToggle();

    expect(effects.level).toBe('lite');
    expect(effects.isAutomatic).toBe(false);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('lite');
    expect(document.documentElement.getAttribute('data-effects')).toBe('lite');
  });

  it('honors the saved choice even on a modest machine', async () => {
    stubCores(2);
    window.localStorage.setItem(STORAGE_KEY, 'full');
    const { useEffectsModel } = await freshEffects();

    expect(useEffectsModel().level).toBe('full');
  });

  it('drops to light after two slow measurements in a row', async () => {
    stubCores(8);
    const { useEffectsModel } = await freshEffects();
    const effects = useEffectsModel();

    effects.actions.onFrameRateMeasured(18);
    expect(effects.level).toBe('full');

    effects.actions.onFrameRateMeasured(22);
    expect(effects.level).toBe('lite');
    expect(document.documentElement.getAttribute('data-effects')).toBe('lite');
  });

  // triste
  it('ignores one slow measurement followed by a good one', async () => {
    stubCores(8);
    const { useEffectsModel } = await freshEffects();
    const effects = useEffectsModel();

    effects.actions.onFrameRateMeasured(18);
    effects.actions.onFrameRateMeasured(60);
    effects.actions.onFrameRateMeasured(18);

    expect(effects.level).toBe('full');
  });

  it('never overrides what the person chose, however slow the machine measures', async () => {
    stubCores(8);
    window.localStorage.setItem(STORAGE_KEY, 'full');
    const { useEffectsModel } = await freshEffects();
    const effects = useEffectsModel();

    effects.actions.onFrameRateMeasured(10);
    effects.actions.onFrameRateMeasured(10);

    expect(effects.level).toBe('full');
  });

  it('ignores an invalid saved value and decides alone', async () => {
    stubCores(8);
    window.localStorage.setItem(STORAGE_KEY, 'turbo');
    const { useEffectsModel } = await freshEffects();

    expect(useEffectsModel().level).toBe('full');
    expect(useEffectsModel().isAutomatic).toBe(true);
  });
});

describe('useEffectsModel — the graphics card and the frame counter', () => {
  function stubRenderer(renderer: string | null, options: { throws?: boolean; noContext?: boolean } = {}) {
    vi.stubGlobal(
      'OffscreenCanvas',
      class {
        getContext() {
          if (options.throws) throw new Error('sem WebGL');
          if (options.noContext) return null;
          return {
            RENDERER: 'renderer',
            getExtension: () => (renderer === null ? null : { UNMASKED_RENDERER_WEBGL: 'unmasked' }),
            getParameter: () => renderer ?? 'ANGLE (NVIDIA)',
          };
        }
      },
    );
  }

  // triste
  it('starts light when the browser draws by software', async () => {
    stubCores(8);
    stubRenderer('Google SwiftShader');
    const { useEffectsModel } = await freshEffects();

    expect(useEffectsModel().level).toBe('lite');
  });

  // feliz
  it('keeps full effects with a real graphics card, without the debug extension, or without WebGL', async () => {
    stubCores(8);
    stubRenderer(null);
    expect((await freshEffects()).useEffectsModel().level).toBe('full');

    stubRenderer('x', { noContext: true });
    expect((await freshEffects()).useEffectsModel().level).toBe('full');

    stubRenderer('x', { throws: true });
    expect((await freshEffects()).useEffectsModel().level).toBe('full');
  });

  // triste
  it('starts light on a machine with little memory', async () => {
    vi.stubGlobal('navigator', { hardwareConcurrency: 8, deviceMemory: 2 });
    const { useEffectsModel } = await freshEffects();

    expect(useEffectsModel().level).toBe('lite');
  });

  // feliz
  it('counts the frames of an animation and drops to light when the machine stutters', async () => {
    stubCores(8);
    let now = 0;
    const raf = vi.fn((callback: FrameRequestCallback) => {
      /* Cada quadro leva 100ms: 10 quadros por segundo, bem abaixo do que a tela precisa. */
      now += 100;
      callback(now);
      return 1;
    });
    vi.stubGlobal('requestAnimationFrame', raf);
    vi.stubGlobal('performance', { now: () => 0 });
    const { useEffectsModel } = await freshEffects();
    const effects = useEffectsModel();

    effects.actions.onAnimationStart(250);
    expect(effects.level).toBe('full');
    effects.actions.onAnimationStart(250);
    expect(effects.level).toBe('lite');
    /* Já leve: a medição para. */
    raf.mockClear();
    effects.actions.onAnimationStart(250);
    expect(raf).not.toHaveBeenCalled();
  });

  // triste
  it('does not measure once the person chose, and never overrides that choice', async () => {
    stubCores(8);
    const raf = vi.fn();
    vi.stubGlobal('requestAnimationFrame', raf);
    const { useEffectsModel } = await freshEffects();
    const effects = useEffectsModel();

    effects.actions.onToggle();
    effects.actions.onToggle();
    expect(effects.level).toBe('full');
    effects.actions.onAnimationStart(100);
    expect(raf).not.toHaveBeenCalled();
    effects.actions.onFrameRateMeasured(10);
    effects.actions.onFrameRateMeasured(10);
    expect(effects.level).toBe('full');
  });

  // triste
  it('does not measure where there is no animation frame', async () => {
    stubCores(8);
    vi.stubGlobal('requestAnimationFrame', undefined);
    const { useEffectsModel } = await freshEffects();
    const effects = useEffectsModel();

    effects.actions.onAnimationStart(100);
    expect(effects.level).toBe('full');
  });
});

describe('useEffectsModel — outside the browser', () => {
  // triste
  /* No servidor não há `window`, `navigator` nem `document`: o palpite é `full` e nada é tocado. */
  it('guesses full effects and touches nothing without a window', async () => {
    vi.stubGlobal('window', undefined);
    vi.stubGlobal('navigator', undefined);
    vi.stubGlobal('document', undefined);
    try {
      const { detectLevel, useEffectsModel } = await freshEffects();

      expect(detectLevel()).toBe('full');
      expect(useEffectsModel().level).toBe('full');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
