import { afterEach, describe, expect, it, vi } from 'vitest';

import { pasteFilesIntoInput } from './paste-files.util';

/* O jsdom não tem `DataTransfer`; este faz o mínimo que o navegador faz. */
class FakeDataTransfer {
  private readonly list: File[] = [];
  readonly items = { add: (file: File) => this.list.push(file) };
  get files() {
    return this.list as unknown as FileList;
  }
}

const print = new File(['png'], 'print.png', { type: 'image/png' });
const pdf = new File(['pdf'], 'nota.pdf', { type: 'application/pdf' });

/* A área com o campo; o campo guarda a lista que receber, como o navegador faz. */
function area({ multiple = false, disabled = false } = {}) {
  const container = document.createElement('div');
  const input = document.createElement('input');
  input.type = 'file';
  input.multiple = multiple;
  input.disabled = disabled;
  let stored: FileList | null = null;
  Object.defineProperty(input, 'files', {
    get: () => stored,
    set: (value: FileList) => {
      stored = value;
    },
  });
  const onPick = vi.fn();
  input.addEventListener('change', () => onPick(Array.from(input.files ?? [])));
  container.append(input);
  return { container, onPick };
}

function paste(container: HTMLElement, files: File[]) {
  const preventDefault = vi.fn();
  const event = { currentTarget: container, clipboardData: { files }, preventDefault };
  pasteFilesIntoInput(event as unknown as Parameters<typeof pasteFilesIntoInput>[0]);
  return preventDefault;
}

describe('pasteFilesIntoInput', () => {
  afterEach(() => vi.unstubAllGlobals());

  // feliz
  it('hands the pasted files to the same file field', () => {
    vi.stubGlobal('DataTransfer', FakeDataTransfer);
    const { container, onPick } = area({ multiple: true });

    paste(container, [print, pdf]);

    expect(onPick).toHaveBeenCalledWith([print, pdf]);
  });

  // feliz
  it('keeps only the first file in a single-file field', () => {
    vi.stubGlobal('DataTransfer', FakeDataTransfer);
    const { container, onPick } = area();

    paste(container, [print, pdf]);

    expect(onPick).toHaveBeenCalledWith([print]);
  });

  // triste
  it('ignores a paste without files, so plain text still pastes', () => {
    vi.stubGlobal('DataTransfer', FakeDataTransfer);
    const { container, onPick } = area();

    const preventDefault = paste(container, []);

    expect(onPick).not.toHaveBeenCalled();
    expect(preventDefault).not.toHaveBeenCalled();
  });

  // triste
  it('ignores a disabled field', () => {
    vi.stubGlobal('DataTransfer', FakeDataTransfer);
    const { container, onPick } = area({ disabled: true });

    paste(container, [print]);

    expect(onPick).not.toHaveBeenCalled();
  });

  // triste
  it('does nothing when the browser has no DataTransfer', () => {
    vi.stubGlobal('DataTransfer', undefined);
    const { container, onPick } = area();

    paste(container, [print]);

    expect(onPick).not.toHaveBeenCalled();
  });
});
