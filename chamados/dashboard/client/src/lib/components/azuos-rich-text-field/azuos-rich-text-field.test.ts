import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import Search from '@lucide/svelte/icons/search';
import { describe, expect, it, vi } from 'vitest';

import RichTextField from './azuos-rich-text-field.svelte';

describe('AzuosRichTextField', () => {
  // feliz
  it('describes the field by its hint and passes on what is typed', async () => {
    const onChange = vi.fn();
    render(RichTextField, {
      props: {
        data: {
          label: 'Prazo',
          name: 'deadline',
          value: '',
          hint: { text: 'Calculado: 45 dias', tone: 'calculated' },
        },
        actions: { onChange },
      },
    });

    const field = screen.getByLabelText('Prazo');
    expect(field).toHaveAccessibleDescription('Calculado: 45 dias');
    await userEvent.type(field, 'a');

    expect(onChange).toHaveBeenCalledWith('a');
  });

  it('turns the magnifier into a search button and searches on Enter', async () => {
    const onSubmit = vi.fn();
    render(RichTextField, {
      props: {
        data: { label: 'Buscar', name: 'q', value: 'impressora' },
        ui: { icon: Search },
        actions: { onSubmit },
      },
    });

    await userEvent.type(screen.getByLabelText('Buscar'), '{Enter}');
    await userEvent.click(screen.getByRole('button', { name: 'Pesquisar' }));

    expect(onSubmit).toHaveBeenCalledTimes(2);
  });

  it('reveals the password by switching the type', async () => {
    render(RichTextField, {
      props: { data: { label: 'Senha', name: 'pwd', value: 'x' }, ui: { type: 'password' } },
    });

    await userEvent.click(screen.getByRole('button', { name: 'Mostrar senha' }));

    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'text');
  });

  // triste
  it('shows the error instead of the hint, announced right away', () => {
    render(RichTextField, {
      props: {
        data: {
          label: 'Prazo',
          name: 'deadline',
          value: '',
          hint: { text: 'Uma dica', tone: 'neutral' },
        },
        state: { error: 'Informe o prazo' },
      },
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Informe o prazo');
    expect(screen.queryByText('Uma dica')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Prazo')).toHaveAttribute('aria-invalid', 'true');
  });

  it('keeps the magnifier as a drawing, not a button, without a search action', () => {
    render(RichTextField, {
      props: { data: { label: 'Buscar', name: 'q', value: '' }, ui: { icon: Search } },
    });

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
