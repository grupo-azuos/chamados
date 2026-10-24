import { fireEvent, render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { createRawSnippet } from 'svelte';
import { describe, expect, it, vi } from 'vitest';

import ToneCard from './azuos-tone-card.svelte';

const children = createRawSnippet(() => ({ render: () => '<p>conteúdo</p>' }));

describe('AzuosToneCard (Svelte)', () => {
  // feliz
  it('paints a static card with the soft tone background, never a colored border', () => {
    render(ToneCard, { props: { data: { label: 'Vencidos' }, ui: { tone: 'danger' }, children } });

    const card = screen.getByRole('group', { name: 'Vencidos' });
    expect(card).toHaveClass('bg-destructive-soft');
    expect(card.className).not.toMatch(/border-(destructive|primary|success|warning|info)/);
  });

  it('fills an interactive card with the tone when the mouse comes in', async () => {
    render(ToneCard, {
      props: { data: { label: 'Em dia' }, ui: { tone: 'success', mode: 'interactive' }, children },
    });

    const card = screen.getByRole('group', { name: 'Em dia' });
    expect(card).toHaveClass('hover-fill', 'bg-card');
    expect(card.style.getPropertyValue('--fill-color')).toBe('var(--success-soft)');
    await fireEvent.pointerEnter(card, { clientX: 4, clientY: 4 });
    expect(card.style.getPropertyValue('--fill-x')).toBe('4px');
  });

  it('turns the card into a button when it is clickable', async () => {
    const onClick = vi.fn();
    render(ToneCard, {
      props: { data: { label: 'Pendentes' }, ui: { tone: 'warning', mode: 'interactive' }, actions: { onClick }, children },
    });

    await userEvent.click(screen.getByRole('button', { name: 'Pendentes' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  // triste
  it('marks the selected card with the full tone color, not a ring', () => {
    render(ToneCard, {
      props: { data: { label: 'Todos' }, ui: { tone: 'brand', mode: 'interactive' }, state: { isSelected: true }, children },
    });

    const card = screen.getByRole('group', { name: 'Todos' });
    expect(card).toHaveClass('bg-primary');
    expect(card.className).not.toMatch(/\bring-/);
  });
});
