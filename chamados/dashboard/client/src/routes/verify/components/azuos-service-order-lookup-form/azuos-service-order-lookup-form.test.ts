import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import ServiceOrderLookupForm from './azuos-service-order-lookup-form.svelte';

function renderForm(code = '', error: string | null = null) {
  const actions = { onChange: vi.fn(), onSubmit: vi.fn() };
  render(ServiceOrderLookupForm, { data: { code }, state: { error }, actions });

  return actions;
}

describe('AzuosServiceOrderLookupForm', () => {
  // feliz
  it('passes on what is typed and asks to check the document', async () => {
    const actions = renderForm('a1b2c3d4e5f6');

    await userEvent.type(screen.getByLabelText(/Código do documento/), '7');
    await userEvent.click(screen.getByRole('button', { name: 'Conferir documento' }));

    expect(actions.onChange).toHaveBeenCalledWith('a1b2c3d4e5f67');
    expect(actions.onSubmit).toHaveBeenCalled();
  });

  it('checks the document on Enter too', async () => {
    const actions = renderForm('a1b2c3d4e5f6');

    await userEvent.type(screen.getByLabelText(/Código do documento/), '{Enter}');

    expect(actions.onSubmit).toHaveBeenCalled();
  });

  // triste
  it('shows why the code is not valid', () => {
    renderForm('a1b2', 'Digite o código do rodapé do documento.');

    expect(screen.getByText('Digite o código do rodapé do documento.')).toBeInTheDocument();
  });
});
