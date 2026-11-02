import { fireEvent, render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import gsap from 'gsap';
import HardDrive from '@lucide/svelte/icons/hard-drive';
import { createRawSnippet } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

import CardSurface from './azuos-card-surface.svelte';

const children = createRawSnippet(() => ({ render: () => '<p>conteúdo</p>' }));

afterEach(() => vi.restoreAllMocks());

describe('AzuosCardSurface (Svelte)', () => {
  // feliz
  it('sits on the brand surface with the neutral border', () => {
    render(CardSurface, { props: { data: { label: 'Máquina' }, children } });

    expect(screen.getByRole('group', { name: 'Máquina' })).toHaveClass('bg-card', 'border-border');
  });

  it('grows the wash from the pointer with GSAP, and shrinks it on leave', async () => {
    const fromTo = vi.spyOn(gsap, 'fromTo');
    const to = vi.spyOn(gsap, 'to');
    render(CardSurface, { props: { data: { label: 'Máquina' }, children } });
    const card = screen.getByRole('group', { name: 'Máquina' });

    await fireEvent.pointerEnter(card, { clientX: 5, clientY: 5 });
    await fireEvent.pointerLeave(card, { clientX: 5, clientY: 5 });

    expect(fromTo).toHaveBeenCalledOnce();
    expect(to).toHaveBeenCalledOnce();
  });

  it('draws the mark in the accent, and turns into a real button when clickable', async () => {
    const onClick = vi.fn();
    const { container } = render(CardSurface, {
      props: {
        data: { label: 'Abrir' },
        ui: { mark: HardDrive, markTone: 'red', isHoverColored: true, hoverTone: 'red' },
        actions: { onClick },
        children,
      },
    });

    expect(container.querySelector('[data-slot="card-mark"]')).toHaveClass('text-hue-red');
    const wash = container.querySelector('[data-slot="card-wash"]') as HTMLElement;
    expect(wash.style.backgroundColor).toContain('--hue-red');
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
  it('skips the growth when motion is reduced, and disables the button while loading', async () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);
    const fromTo = vi.spyOn(gsap, 'fromTo');
    render(CardSurface, {
      props: {
        data: { label: 'Carregando' },
        state: { isDisabled: true },
        actions: { onClick: vi.fn() },
        children,
      },
    });
    const card = screen.getByRole('group', { name: 'Carregando' });

    await fireEvent.pointerEnter(card, { clientX: 1, clientY: 1 });
    await fireEvent.pointerLeave(card, { clientX: 1, clientY: 1 });

    expect(fromTo).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Carregando' })).toBeDisabled();
  });
});
