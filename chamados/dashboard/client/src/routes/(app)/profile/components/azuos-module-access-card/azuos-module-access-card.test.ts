import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import ModuleAccessCard from './azuos-module-access-card.svelte';

describe('AzuosModuleAccessCard', () => {
  // feliz
  it('shows the level of the person in each module', () => {
    const { getByRole, getByText } = render(ModuleAccessCard, {
      props: { data: { role: 'user', roles: { infra: 'admin' } } },
    });

    expect(getByRole('region', { name: 'Seus módulos' })).toBeInTheDocument();
    expect(getByText('Infraestrutura')).toBeInTheDocument();
    expect(getByText('Administrador')).toBeInTheDocument();
  });

  // triste
  it('says when a module is closed to the person', () => {
    const { getAllByText } = render(ModuleAccessCard, { props: { data: { role: 'user', roles: {} } } });

    expect(getAllByText('Sem acesso')).toHaveLength(3);
  });
});
