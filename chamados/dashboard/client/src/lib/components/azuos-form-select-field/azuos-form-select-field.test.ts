import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import FormSelectField from './azuos-form-select-field.svelte';

const options = [
  { value: 'user', label: 'Usuário' },
  { value: 'admin', label: 'Administrador' },
];

describe('AzuosFormSelectField', () => {
  // feliz
  it('shows the label, the chosen option and the hint', () => {
    render(FormSelectField, {
      props: {
        data: { label: 'Papel', value: 'user', options, hint: 'Gestor só libera o nível Usuário' },
      },
    });

    expect(screen.getByText('Papel')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Papel' })).toHaveTextContent('Usuário');
    expect(screen.getByText('Gestor só libera o nível Usuário')).not.toHaveAttribute('role');
  });

  // triste
  it('shows the error instead of the hint, announced right away', () => {
    render(FormSelectField, {
      props: {
        data: { label: 'Papel', value: '', options, hint: 'Uma dica' },
        state: { error: 'Escolha um papel', isRequired: true },
      },
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Escolha um papel');
    expect(screen.queryByText('Uma dica')).not.toBeInTheDocument();
  });

  it('keeps the label and the message for screen readers only when hidden', () => {
    render(FormSelectField, {
      props: {
        data: { label: 'Papel', value: 'user', options, hint: 'Dica' },
        ui: { isLabelHidden: true },
      },
    });

    expect(screen.getByText('Papel')).toHaveClass('sr-only');
    expect(screen.getByText('Dica')).toHaveClass('sr-only');
  });
});
