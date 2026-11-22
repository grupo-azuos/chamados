import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import PersonPickerField, { personOptions } from './azuos-person-picker-field.svelte';

const people = [
  { id: 'u-ana', name: 'Ana Souza', photo: '/ana.png' },
  { id: 'u-bruno', name: 'Bruno Lima', photo: null },
];

describe('AzuosPersonPickerField', () => {
  // feliz
  it('gives each person the photo and keeps the id as the value', () => {
    expect(personOptions(people)).toEqual([
      { value: 'u-ana', label: 'Ana Souza', personName: 'Ana Souza', avatarUrl: '/ana.png' },
      { value: 'u-bruno', label: 'Bruno Lima', personName: 'Bruno Lima', avatarUrl: null },
    ]);
  });

  // feliz
  it('picks a person by the id', async () => {
    const onChange = vi.fn();
    render(PersonPickerField, {
      props: { data: { value: '', people }, ui: { ariaLabel: 'Responsável' }, actions: { onChange } },
    });

    await fireEvent.click(screen.getByRole('combobox', { name: 'Responsável' }));
    await fireEvent.click(await screen.findByRole('option', { name: /Bruno Lima/ }));

    expect(onChange).toHaveBeenCalledWith('u-bruno');
  });

  // triste
  it('asks for a person while nobody is chosen', () => {
    render(PersonPickerField, {
      props: { data: { value: '', people }, ui: { ariaLabel: 'Responsável' }, actions: { onChange: vi.fn() } },
    });

    expect(screen.getByRole('combobox', { name: 'Responsável' })).toHaveTextContent('Escolha a pessoa');
  });
});
