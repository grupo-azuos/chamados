import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import Harness from './azuos-expandable-screen-harness.test.svelte';
import { isOwnEscape } from './azuos-expandable-screen.svelte';

describe('AzuosExpandableScreen', () => {
  // feliz
  it('opens over everything with the title, the content and the footer', () => {
    render(Harness, { props: { isOpen: true, onClose: vi.fn(), withFooter: true } });

    expect(screen.getByRole('dialog', { name: 'Montar o painel' })).toBeInTheDocument();
    expect(screen.getByText('Conteúdo da tela')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeInTheDocument();
  });

  // feliz
  it('closes with the X and with Esc', async () => {
    const onClose = vi.fn();
    render(Harness, { props: { isOpen: true, onClose } });

    await fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    await fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  // triste
  it('shows nothing while closed', () => {
    render(Harness, { props: { isOpen: false, onClose: vi.fn() } });

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  // triste
  it('does not take an Esc that is not its own', () => {
    const element = document.createElement('div');

    expect(isOwnEscape(new KeyboardEvent('keydown', { key: 'Enter' }), element)).toBe(false);
    expect(isOwnEscape(new KeyboardEvent('keydown', { key: 'Escape' }), element)).toBe(false);
  });
});
