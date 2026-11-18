import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import Harness from './azuos-masked-text-field-harness.test.svelte';

describe('AzuosMaskedTextField', () => {
  // feliz
  it('puts the punctuation in while typing a CPF', async () => {
    render(Harness, { props: { mask: 'cpf' } });

    await userEvent.type(screen.getByLabelText('Documento'), '12345678909');

    expect(screen.getByLabelText('Documento')).toHaveValue('123.456.789-09');
  });

  it('opens the numeric keyboard on the phone for a CEP', () => {
    render(Harness, { props: { mask: 'cep' } });

    expect(screen.getByLabelText('Documento')).toHaveAttribute('inputmode', 'numeric');
    expect(screen.getByLabelText('Documento')).toHaveAttribute('placeholder', '00000-000');
  });

  // triste
  it('keeps letters out of a number field', async () => {
    render(Harness, { props: { mask: 'cep' } });

    await userEvent.type(screen.getByLabelText('Documento'), '74a23');

    expect(screen.getByLabelText('Documento')).toHaveValue('7423');
  });

  it('complains about the format only after leaving the field', async () => {
    render(Harness, { props: { mask: 'cpf' } });
    const field = screen.getByLabelText('Documento');

    await userEvent.type(field, '123');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    await userEvent.tab();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(field).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows the error of whoever uses the field before the format one', () => {
    render(Harness, { props: { mask: 'cpf', error: 'Informe o CPF' } });

    expect(screen.getByRole('alert')).toHaveTextContent('Informe o CPF');
  });
});
