import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
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

  /* O card não se mexe no hover: nem sobe, nem muda a sombra, nem ganha véu ou ícone no canto. */
  it('stays still on hover, and turns into a real button when clickable', async () => {
    const onClick = vi.fn();
    const { container } = render(CardSurface, {
      props: { data: { label: 'Abrir' }, actions: { onClick }, children },
    });

    const card = screen.getByRole('group', { name: 'Abrir' });
    expect(card).toHaveClass('cursor-pointer');
    expect(card.className).not.toMatch(/hover:|translate|transition|duration|shadow-card-hover/);
    expect(container.querySelector('[data-slot="card-wash"]')).toBeNull();
    expect(container.querySelector('[data-slot="card-mark"]')).toBeNull();
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
  it('disables the button while loading', () => {
    render(CardSurface, {
      props: {
        data: { label: 'Carregando' },
        state: { isDisabled: true },
        actions: { onClick: vi.fn() },
        children,
      },
    });

    expect(screen.getByRole('button', { name: 'Carregando' })).toBeDisabled();
  });
});
