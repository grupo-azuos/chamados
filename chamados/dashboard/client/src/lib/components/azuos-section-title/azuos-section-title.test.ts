import { render, screen } from '@testing-library/svelte';
import UserRound from '@lucide/svelte/icons/user-round';
import { describe, expect, it } from 'vitest';

import SectionTitle from './azuos-section-title.svelte';

describe('AzuosSectionTitle', () => {
  // feliz
  it('shows the title as a heading and its explanation', () => {
    render(SectionTitle, {
      props: {
        data: { title: 'Dados pessoais', description: 'Nome e contato de quem usa o sistema' },
        ui: { icon: UserRound },
      },
    });

    expect(screen.getByRole('heading', { name: 'Dados pessoais' })).toBeInTheDocument();
    expect(screen.getByText('Nome e contato de quem usa o sistema')).toBeInTheDocument();
  });

  it('paints the danger zone in red', () => {
    render(SectionTitle, {
      props: { data: { title: 'Zona de perigo' }, ui: { icon: UserRound, tone: 'danger' } },
    });

    expect(screen.getByRole('heading', { name: 'Zona de perigo' })).toHaveClass('text-destructive');
  });

  // triste
  it('writes no explanation line when there is none', () => {
    const { container } = render(SectionTitle, {
      props: { data: { title: 'Sistemas', description: null }, ui: { icon: UserRound } },
    });

    expect(container.querySelector('p')).toBeNull();
  });
});
