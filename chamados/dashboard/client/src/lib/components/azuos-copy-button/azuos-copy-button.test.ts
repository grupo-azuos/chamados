import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import CopyButton from './azuos-copy-button.svelte';

const data = { text: 'agt_3f9a6c1e8b4d47a2b0c5e7f1a9d2b6c4', label: 'Copiar código' };

/* A área de transferência é trocada por um dublê em cada teste: o jsdom não tem uma de verdade. */
function stubClipboard(writeText: ReturnType<typeof vi.fn>): void {
  vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('AzuosCopyButton', () => {
  // feliz
  it('is an icon button named by its label', () => {
    render(CopyButton, { props: { data } });

    expect(screen.getByRole('button', { name: 'Copiar código' })).toBeInTheDocument();
  });

  // feliz
  it('copies the text, says "Copiado!" and tells who asked', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const onCopied = vi.fn();
    stubClipboard(writeText);
    render(CopyButton, { props: { data, actions: { onCopied } } });

    await userEvent.click(screen.getByRole('button', { name: 'Copiar código' }));

    expect(writeText).toHaveBeenCalledWith(data.text);
    expect(await screen.findByRole('button', { name: 'Copiado!' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Copiado!');
    expect(onCopied).toHaveBeenCalledOnce();
  });

  // feliz
  it('goes back to the usual label a moment after copying', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    stubClipboard(vi.fn().mockResolvedValue(undefined));
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(CopyButton, { props: { data } });

    await user.click(screen.getByRole('button', { name: 'Copiar código' }));
    expect(await screen.findByRole('button', { name: 'Copiado!' })).toBeInTheDocument();
    await vi.advanceTimersByTimeAsync(2500);

    expect(screen.getByRole('button', { name: 'Copiar código' })).toBeInTheDocument();
  });

  // feliz
  it('reads on the inverted box with the inverse tone', () => {
    render(CopyButton, { props: { data, ui: { tone: 'inverse' } } });

    expect(screen.getByRole('button', { name: 'Copiar código' })).toHaveClass('text-background/70');
  });

  // triste
  it('does not claim it copied when the browser refuses', async () => {
    const onCopied = vi.fn();
    stubClipboard(vi.fn().mockRejectedValue(new Error('denied')));
    render(CopyButton, { props: { data, actions: { onCopied } } });

    await userEvent.click(screen.getByRole('button', { name: 'Copiar código' }));

    expect(screen.getByRole('button', { name: 'Copiar código' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Copiado!' })).not.toBeInTheDocument();
    expect(onCopied).not.toHaveBeenCalled();
  });

  // triste
  it('does not break when the browser has no clipboard at all', async () => {
    vi.stubGlobal('navigator', { ...navigator, clipboard: undefined });
    render(CopyButton, { props: { data } });

    await userEvent.click(screen.getByRole('button', { name: 'Copiar código' }));

    expect(screen.getByRole('button', { name: 'Copiar código' })).toBeInTheDocument();
  });
});
