import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import FilterChoice, { optionTone } from './azuos-filter-choice.svelte';

const OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'open', label: 'Em aberto' },
  { value: 'done', label: 'Resolvido' },
];

describe('AzuosFilterChoice', () => {
  // feliz
  it('shows every option in sight and chooses one with a click', async () => {
    const onChange = vi.fn();
    render(FilterChoice, {
      props: { data: { label: 'Situação', value: 'open', options: OPTIONS }, ui: { display: 'chips' }, actions: { onChange } },
    });

    expect(screen.getByRole('radio', { name: 'Em aberto' })).toHaveAttribute('aria-checked', 'true');
    await fireEvent.click(screen.getByRole('radio', { name: 'Resolvido' }));
    expect(onChange).toHaveBeenCalledWith('done');
  });

  // feliz
  it('shows only the faces of the people, each named for the screen reader', () => {
    render(FilterChoice, {
      props: {
        data: { label: 'Pessoa', value: '', options: [{ value: 'ana', label: 'Ana Lima', personName: 'Ana Lima' }] },
        ui: { display: 'avatars' },
        actions: { onChange: vi.fn() },
      },
    });

    expect(screen.getByRole('radio', { name: 'Ana Lima' })).toBeInTheDocument();
  });

  // triste
  it('does not uncheck the chosen option when clicked again: "Todos" is what clears', async () => {
    const onChange = vi.fn();
    render(FilterChoice, {
      props: { data: { label: 'Situação', value: 'open', options: OPTIONS }, ui: { display: 'list' }, actions: { onChange } },
    });

    await fireEvent.click(screen.getByRole('radio', { name: 'Em aberto' }));
    expect(onChange).toHaveBeenCalledWith('open');
    expect(optionTone('list', false)).not.toContain('bg-primary');
  });
});
