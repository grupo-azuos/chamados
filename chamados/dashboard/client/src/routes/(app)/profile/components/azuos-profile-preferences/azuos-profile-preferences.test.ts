import { render } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import ProfilePreferences from './azuos-profile-preferences.svelte';

beforeEach(() => {
  window.localStorage.clear();
});

describe('AzuosProfilePreferences', () => {
  // feliz
  it('shows the theme and effects preferences under the appearance section', () => {
    const { getByRole } = render(ProfilePreferences);

    expect(getByRole('region', { name: 'Aparência' })).toBeInTheDocument();
    expect(getByRole('heading', { name: 'Tema' })).toBeInTheDocument();
    expect(getByRole('heading', { name: 'Efeitos' })).toBeInTheDocument();
    expect(getByRole('button', { name: /tema/i })).toBeInTheDocument();
  });

  // triste
  it('keeps both controls usable after the theme is switched', async () => {
    const { getByRole, getAllByRole } = render(ProfilePreferences);

    await userEvent.click(getByRole('button', { name: /tema/i }));

    expect(getAllByRole('button')).toHaveLength(2);
  });
});
