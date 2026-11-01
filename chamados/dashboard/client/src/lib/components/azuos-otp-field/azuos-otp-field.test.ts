import { fireEvent, render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { eraseAt, replaceFrom, toDigits } from './azuos-otp-field.svelte';
import Harness from './azuos-otp-field-harness.test.svelte';

describe('AzuosOtpField', () => {
  // feliz
  it('fills one box per digit and finishes on the last one', async () => {
    const onComplete = vi.fn();
    render(Harness, { props: { onComplete } });

    await userEvent.type(screen.getByLabelText('Dígito 1 de 6'), '123456');

    expect(screen.getByTestId('valor')).toHaveTextContent('123456');
    expect(onComplete).toHaveBeenCalledWith('123456');
  });

  it('takes the whole code pasted into any box', async () => {
    const onComplete = vi.fn();
    render(Harness, { props: { onComplete } });

    await fireEvent.paste(screen.getByLabelText('Dígito 3 de 6'), {
      clipboardData: { getData: () => '98 76 54' },
    });

    expect(screen.getByTestId('valor')).toHaveTextContent('987654');
    expect(onComplete).toHaveBeenCalledWith('987654');
  });

  it('is a named group with the one-time-code hint only on the first box', () => {
    render(Harness, { props: { onComplete: vi.fn() } });

    expect(screen.getByRole('group', { name: 'Código recebido' })).toBeInTheDocument();
    expect(screen.getByLabelText('Dígito 1 de 6')).toHaveAttribute('autocomplete', 'one-time-code');
    expect(screen.getByLabelText('Dígito 2 de 6')).toHaveAttribute('autocomplete', 'off');
  });

  // triste
  it('keeps letters out of the boxes', async () => {
    render(Harness, { props: { onComplete: vi.fn() } });

    await userEvent.type(screen.getByLabelText('Dígito 1 de 6'), 'a');

    expect(screen.getByLabelText('Dígito 1 de 6')).toHaveValue('');
    expect(screen.getByTestId('valor')).toHaveTextContent('');
  });

  it('writes from a position and erases without leaving holes', () => {
    expect(replaceFrom(toDigits('12', 6), 2, '34', 6)).toBe('1234');
    expect(eraseAt(toDigits('1234', 6), 3)).toBe('123');
  });
});
