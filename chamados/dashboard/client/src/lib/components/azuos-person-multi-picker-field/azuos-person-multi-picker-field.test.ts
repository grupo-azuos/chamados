import { render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import PersonMultiPickerField from './azuos-person-multi-picker-field.svelte';

const people = [
  { id: 'u-ana', name: 'Ana Souza', photo: null },
  { id: 'u-bruno', name: 'Bruno Lima', photo: null },
  { id: 'u-carla', name: 'Carla Dias', photo: null },
];

describe('AzuosPersonMultiPickerField', () => {
  // feliz
  it('sums up who was chosen', () => {
    render(PersonMultiPickerField, {
      props: { data: { values: ['u-ana'], people }, ui: { ariaLabel: 'Quem acompanha' }, actions: { onChange: vi.fn() } },
    });

    expect(screen.getByRole('button', { name: /Quem acompanha/ })).toHaveTextContent('Ana Souza');
  });

  // triste
  it('asks for people while nobody is chosen', () => {
    render(PersonMultiPickerField, {
      props: { data: { values: [], people }, ui: { ariaLabel: 'Quem acompanha' }, actions: { onChange: vi.fn() } },
    });

    expect(screen.getByRole('button', { name: /Quem acompanha/ })).toHaveTextContent('Escolha as pessoas');
  });
});
