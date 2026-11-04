import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import MemoryStick from '@lucide/svelte/icons/memory-stick';
import { createRawSnippet } from 'svelte';
import { describe, expect, it, vi } from 'vitest';

import ContentCard from './azuos-content-card.svelte';

const children = createRawSnippet(() => ({ render: () => '<h3>Computador 01</h3>' }));

describe('AzuosContentCard (Svelte)', () => {
  // feliz
  it('draws the subject icon big in the corner, in its accent, over the brand surface', () => {
    const { container } = render(ContentCard, {
      props: {
        data: { label: 'Computador 01' },
        ui: { tone: 'amber', icon: MemoryStick },
        children,
      },
    });

    expect(screen.getByRole('heading', { name: 'Computador 01' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Computador 01' })).toHaveClass('bg-card');
    expect(container.querySelector('[data-slot="card-mark"]')).toHaveClass('text-hue-amber');
  });

  it('opens when clicked', async () => {
    const onClick = vi.fn();
    render(ContentCard, { props: { data: { label: 'Abrir' }, actions: { onClick }, children } });

    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  // triste
  it('draws no mark without an icon', () => {
    const { container } = render(ContentCard, { props: { children } });

    expect(container.querySelector('[data-slot="card-mark"]')).toBeNull();
  });
});
