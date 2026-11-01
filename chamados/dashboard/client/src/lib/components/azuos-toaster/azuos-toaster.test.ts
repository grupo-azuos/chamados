import { render, screen } from '@testing-library/svelte';
import { toast } from 'svelte-sonner';
import { afterEach, describe, expect, it } from 'vitest';

import Toaster, { TOAST_DURATION_MS, TOASTER_TOKENS } from './azuos-toaster.svelte';

describe('AzuosToaster', () => {
  afterEach(() => {
    toast.dismiss();
  });

  // feliz
  it('shows a notice that someone asked for, in a named area', async () => {
    render(Toaster);

    toast('Chamado aberto.');

    expect(await screen.findByText('Chamado aberto.')).toBeInTheDocument();
    expect(screen.getByLabelText(/Avisos/)).toBeInTheDocument();
  });

  it('gives every notice the same five seconds', () => {
    expect(TOAST_DURATION_MS).toBe(5000);
  });

  // triste
  it('paints failures with the soft red background and a neutral border, never a red one', () => {
    expect(TOASTER_TOKENS).toContain('--error-bg: var(--destructive-soft)');
    expect(TOASTER_TOKENS).toContain('--error-border: var(--border)');
  });
});
