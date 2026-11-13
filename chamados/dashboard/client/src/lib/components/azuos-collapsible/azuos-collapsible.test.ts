import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import Harness from './azuos-collapsible-harness.test.svelte';

const data = { title: 'Filtros avançados' };

describe('AzuosCollapsible', () => {
  // feliz
  it('starts closed, with the title always visible', () => {
    render(Harness, { props: { data } });

    expect(screen.getByRole('button', { name: 'Filtros avançados' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('opens on click and tells the screen', async () => {
    const onOpenChange = vi.fn();
    render(Harness, { props: { data, actions: { onOpenChange } } });

    await fireEvent.click(screen.getByRole('button', { name: 'Filtros avançados' }));

    expect(screen.getByRole('button', { name: 'Filtros avançados' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  /* Abre deslizando, e sem animação para quem pediu menos movimento ao sistema. */
  it('slides the content in, unless the system asks for less motion', () => {
    render(Harness, { props: { data, state: { isOpen: true } } });

    const content = screen.getByTestId('conteudo').closest('[data-state]');

    expect(content).toHaveAttribute('data-state', 'open');
    expect(content?.className).toContain('data-[state=open]:animate-collapsible-down');
    expect(content?.className).toContain('motion-reduce:animate-none');
  });

  it('is born open when the screen asks for it', () => {
    render(Harness, { props: { data, state: { isOpen: true } } });

    expect(screen.getByRole('button', { name: 'Filtros avançados' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByTestId('conteudo')).toBeInTheDocument();
  });

  // triste
  it('does not open when disabled', async () => {
    const onOpenChange = vi.fn();
    render(Harness, { props: { data, state: { isDisabled: true }, actions: { onOpenChange } } });

    await fireEvent.click(screen.getByRole('button', { name: 'Filtros avançados' }));

    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Filtros avançados' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });
});
