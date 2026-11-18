import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { createRawSnippet } from 'svelte';
import { describe, expect, it, vi } from 'vitest';

import ToneCard from './azuos-tone-card.svelte';

const children = createRawSnippet(() => ({ render: () => '<p>conteúdo</p>' }));

describe('AzuosToneCard (Svelte)', () => {
  // feliz
  it('sits on the brand surface whatever the tone, never a coloured background', () => {
    render(ToneCard, { props: { data: { label: 'Vencidos' }, ui: { tone: 'danger' }, children } });

    const card = screen.getByRole('group', { name: 'Vencidos' });
    expect(card).toHaveClass('bg-card');
    expect(card.className).not.toMatch(/bg-hue|-soft|-fill/);
  });

  it('colours the hover wash with its tone when interactive', () => {
    const { container } = render(ToneCard, {
      props: { data: { label: 'Em dia' }, ui: { tone: 'success', mode: 'interactive' }, children },
    });

    const wash = container.querySelector('[data-slot="card-wash"]') as HTMLElement;
    expect(wash.style.backgroundColor).toContain('--hue-green');
  });

  it('turns the card into a button when it is clickable', async () => {
    const onClick = vi.fn();
    render(ToneCard, { props: { data: { label: 'Pendentes' }, actions: { onClick }, children } });

    await userEvent.click(screen.getByRole('button', { name: 'Pendentes' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('marks the selected card in the light blue of the brand', () => {
    render(ToneCard, {
      props: {
        data: { label: 'Todos' },
        ui: { tone: 'brand' },
        state: { isSelected: true },
        children,
      },
    });

    expect(screen.getByRole('group', { name: 'Todos' })).toHaveClass('bg-card-selected');
  });

  // triste
  it('keeps a neutral wash on a static card, and is not a button without an action', () => {
    const { container } = render(ToneCard, { props: { data: { label: 'Neutro' }, children } });

    const wash = container.querySelector('[data-slot="card-wash"]') as HTMLElement;
    expect(wash.style.backgroundColor).toContain('--foreground');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
