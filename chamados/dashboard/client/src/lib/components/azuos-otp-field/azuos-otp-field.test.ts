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

describe('AzuosOtpField — keys, pasting and states', () => {
  const box = (index: number) => screen.getByLabelText(`Dígito ${index} de 6`);

  // feliz
  it('moves between the boxes with the arrows and erases backwards', async () => {
    render(Harness, { props: { onComplete: vi.fn(), initial: '123' } });

    box(2).focus();
    await fireEvent.keyDown(box(2), { key: 'ArrowRight' });
    expect(box(3)).toHaveFocus();
    await fireEvent.keyDown(box(3), { key: 'ArrowLeft' });
    expect(box(2)).toHaveFocus();

    /* Caixa cheia: apaga aqui e fica. */
    await fireEvent.keyDown(box(3), { key: 'Backspace' });
    expect(screen.getByTestId('valor')).toHaveTextContent('12');
    /* Caixa vazia: volta uma e apaga lá. */
    await fireEvent.keyDown(box(4), { key: 'Backspace' });
    expect(screen.getByTestId('valor')).toHaveTextContent('1');
  });

  // triste
  it('does nothing on Backspace in the very first empty box, on other keys or on an empty paste', async () => {
    render(Harness, { props: { onComplete: vi.fn() } });

    await fireEvent.keyDown(box(1), { key: 'Backspace' });
    await fireEvent.keyDown(box(1), { key: 'a' });
    await fireEvent.paste(box(1), { clipboardData: { getData: () => 'abc' } });
    expect(screen.getByTestId('valor')).toHaveTextContent('');
  });

  // triste
  it('announces the error, blocks the boxes and focuses the first one when asked', () => {
    render(Harness, { props: { onComplete: vi.fn(), error: 'Código inválido.', isDisabled: true, isAutoFocused: true } });

    expect(screen.getByRole('alert')).toHaveTextContent('Código inválido.');
    expect(box(1)).toHaveAttribute('aria-invalid', 'true');
    expect(box(1)).toBeDisabled();
    expect(box(1)).toHaveAttribute('autofocus');
  });
});
