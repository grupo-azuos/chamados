import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import AzuosCalendarDropdown, { calendarMonthName } from './azuos-calendar-dropdown.svelte';

const MONTHS = [
  { value: 1, label: 'Janeiro', disabled: true },
  { value: 2, label: 'Fevereiro', disabled: false },
  { value: 3, label: 'Março', disabled: false },
];

function renderDropdown(props: { disabled?: boolean } = {}) {
  const onChange = vi.fn();
  const view = render(AzuosCalendarDropdown, {
    props: { options: MONTHS, value: 3, ariaLabel: 'Mês', onChange, ...props },
  });

  return { onChange, ...view };
}

async function open() {
  await fireEvent.click(screen.getByRole('button', { name: 'Mês: Março' }));
}

describe('calendarMonthName', () => {
  // feliz
  it('writes the month in Portuguese, in full and capitalized', () => {
    expect(calendarMonthName(3)).toBe('Março');
    expect(calendarMonthName(12)).toBe('Dezembro');
  });
});

describe('AzuosCalendarDropdown', () => {
  // feliz
  it('shows the current option and keeps the list closed', () => {
    renderDropdown();

    expect(screen.getByRole('button', { name: 'Mês: Março' })).toHaveTextContent('Março');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  // feliz
  it('opens our own list, with the current option marked', async () => {
    renderDropdown();

    await open();

    expect(screen.getByRole('listbox', { name: 'Mês' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Março' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('option', { name: 'Fevereiro' })).toHaveAttribute('aria-selected', 'false');
  });

  // feliz
  it('tells the calendar the chosen value and closes the list', async () => {
    const { onChange } = renderDropdown();

    await open();
    await fireEvent.click(screen.getByRole('option', { name: 'Fevereiro' }));

    expect(onChange).toHaveBeenCalledExactlyOnceWith(2);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  // feliz
  it('closes the list when the focus leaves it', async () => {
    renderDropdown();

    await open();
    await fireEvent.focusOut(screen.getByRole('button', { name: 'Mês: Março' }));

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  // triste
  it('does not use the native select', async () => {
    const { container } = renderDropdown();

    await open();

    expect(container.querySelector('select')).toBeNull();
  });

  // triste
  it('does not choose an option outside the limit', async () => {
    const { onChange } = renderDropdown();

    await open();
    await fireEvent.click(screen.getByRole('option', { name: 'Janeiro' }));

    expect(screen.getByRole('option', { name: 'Janeiro' })).toBeDisabled();
    expect(onChange).not.toHaveBeenCalled();
  });

  // triste
  it('does not open when disabled', async () => {
    renderDropdown({ disabled: true });

    await fireEvent.click(screen.getByRole('button', { name: 'Mês: Março' }));

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
