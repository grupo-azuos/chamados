import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import HardDrive from '@lucide/svelte/icons/hard-drive';
import { createRawSnippet } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

import CardSurface from './azuos-card-surface.svelte';

const children = createRawSnippet(() => ({ render: () => '<p>conteúdo</p>' }));

afterEach(() => vi.restoreAllMocks());

describe('AzuosCardSurface (Svelte)', () => {
  // feliz
  it('sits on the brand surface without a border, separated by the Apple shadow', () => {
    render(CardSurface, { props: { data: { label: 'Máquina' }, children } });

    const card = screen.getByRole('group', { name: 'Máquina' });
    expect(card).toHaveClass('bg-card', 'shadow-card');
    expect(card).not.toHaveClass('border');
  });

  /* Sem a mancha animada: o card neutro ganha o véu do tema, parado, só no hover. */
  it('covers a neutral card with the still theme veil, only on hover', () => {
    const { container } = render(CardSurface, { props: { data: { label: 'Máquina' }, children } });

    const wash = container.querySelector('[data-slot="card-wash"]') as HTMLElement;
    expect(wash).toHaveClass('inset-0', 'group-hover/card:bg-(--card-veil)');
    expect(wash.style.getPropertyValue('--card-veil')).toBe('var(--hover-veil)');
  });

  it('draws the mark in the accent, and turns into a real button when clickable', async () => {
    const onClick = vi.fn();
    const { container } = render(CardSurface, {
      props: {
        data: { label: 'Abrir' },
        ui: { mark: HardDrive, markTone: 'red' },
        actions: { onClick },
        children,
      },
    });

    expect(container.querySelector('[data-slot="card-mark"]')).toHaveClass('text-hue-red');
    /* A cor fica na marca d'água; o véu do hover continua neutro. */
    const wash = container.querySelector('[data-slot="card-wash"]') as HTMLElement;
    expect(wash.style.getPropertyValue('--card-veil')).toBe('var(--hover-veil)');
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('turns light blue with white text when selected', () => {
    render(CardSurface, {
      props: { data: { label: 'Filtro' }, state: { isSelected: true }, children },
    });

    expect(screen.getByRole('group', { name: 'Filtro' })).toHaveClass('bg-card-selected');
  });

  // triste
  it('disables the button while loading, and a card with a toned mark keeps the neutral veil', () => {
    const { container } = render(CardSurface, {
      props: {
        data: { label: 'Carregando' },
        ui: { mark: HardDrive, markTone: 'red' },
        state: { isDisabled: true },
        actions: { onClick: vi.fn() },
        children,
      },
    });

    expect(screen.getByRole('button', { name: 'Carregando' })).toBeDisabled();
    const wash = container.querySelector('[data-slot="card-wash"]') as HTMLElement;
    expect(wash.style.getPropertyValue('--card-veil')).toBe('var(--hover-veil)');
  });
});
