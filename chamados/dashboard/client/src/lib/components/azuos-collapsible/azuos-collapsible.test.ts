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
    expect(content?.className).toContain('data-[state=open]:motion-safe:animate-collapsible-down');
    expect(content?.className).not.toContain('data-[state=open]:animate-collapsible-down');
  });

  it('is born open when the screen asks for it', () => {
    render(Harness, { props: { data, state: { isOpen: true } } });

    expect(screen.getByRole('button', { name: 'Filtros avançados' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByTestId('conteudo')).toBeInTheDocument();
  });

  it('shows the badge beside the title and keeps the aside action out of the toggle', async () => {
    const onOpenChange = vi.fn();
    const onAside = vi.fn();
    render(Harness, {
      props: { data: { title: 'Filtros', badge: '2 ativos' }, state: { isOpen: true }, actions: { onOpenChange }, onAside },
    });

    expect(screen.getByRole('button', { name: /Filtros.*2 ativos/ })).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));

    expect(onAside).toHaveBeenCalledOnce();
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByTestId('conteudo')).toBeInTheDocument();
  });

  // triste
  it('draws no badge when there is nothing to count', () => {
    render(Harness, { props: { data: { title: 'Filtros', badge: '' } } });

    expect(screen.getByRole('button', { name: 'Filtros' })).toBeInTheDocument();
  });

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
