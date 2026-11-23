import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import TaskOwnerAvatar from './azuos-task-owner-avatar.svelte';

describe('AzuosTaskOwnerAvatar', () => {
  // feliz
  it('shows the initials of the owner', () => {
    render(TaskOwnerAvatar, { props: { owner: { id: 'a', name: 'Ana Prado', avatarUrl: null } } });

    expect(screen.getByText('AP')).toBeInTheDocument();
  });

  // triste
  it('shows a neutral icon, not initials, when there is no owner', () => {
    const { container } = render(TaskOwnerAvatar, { props: { owner: null } });

    expect(container.querySelector('svg')).not.toBeNull();
    expect(screen.queryByText(/^[A-Z]{1,2}$/)).not.toBeInTheDocument();
  });
});
