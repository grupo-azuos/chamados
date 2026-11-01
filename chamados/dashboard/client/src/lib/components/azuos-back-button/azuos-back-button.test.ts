import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import BackButton from './azuos-back-button.svelte';

describe('AzuosBackButton', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // feliz
  it('is a link to the destination, written "Voltar para …"', () => {
    render(BackButton, { props: { data: { destination: 'os projetos', to: '/system/projects' } } });

    expect(screen.getByRole('link', { name: 'Voltar para os projetos' })).toHaveAttribute(
      'href',
      '/system/projects',
    );
  });

  // feliz
  it('has the paralegal back look: brand blue, small text, no bold, underline on hover', () => {
    render(BackButton, { props: { data: { destination: 'empresas', to: '/companies' } } });

    const link = screen.getByRole('link', { name: 'Voltar para empresas' });
    expect(link).toHaveClass('text-brand-blue-700', 'text-sm', 'gap-1', 'hover:underline');
    expect(link).not.toHaveClass('font-medium');
    expect(link.querySelector('svg')).toHaveClass('size-3.5');
  });

  it('calls onClick instead of going back when it is given', async () => {
    const onClick = vi.fn();
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {});
    render(BackButton, { props: { data: { destination: 'a lista' }, actions: { onClick } } });

    await userEvent.click(screen.getByRole('button', { name: 'Voltar para a lista' }));

    expect(onClick).toHaveBeenCalledOnce();
    expect(back).not.toHaveBeenCalled();
  });

  it('goes back in history with neither a destination nor a click handler', async () => {
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {});
    render(BackButton, { props: { data: {} } });

    await userEvent.click(screen.getByRole('button', { name: 'Voltar' }));

    expect(back).toHaveBeenCalledOnce();
  });

  // triste
  it('turns into a disabled button, never a link, when disabled', () => {
    render(BackButton, {
      props: {
        data: { destination: 'os projetos', to: '/system/projects' },
        state: { isDisabled: true },
      },
    });

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Voltar para os projetos' })).toBeDisabled();
  });
});
