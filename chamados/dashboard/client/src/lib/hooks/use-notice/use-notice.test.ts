import { toast } from 'svelte-sonner';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useNotice } from './use-notice';

vi.mock('svelte-sonner', () => {
  const toastFn = Object.assign(vi.fn(), { error: vi.fn(), dismiss: vi.fn() });

  return { toast: toastFn };
});

describe('useNotice', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  // feliz
  it('shows a plain notice', () => {
    useNotice().show('Chamado aberto.');

    expect(toast).toHaveBeenCalledWith('Chamado aberto.');
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('closes every notice on dismiss', () => {
    useNotice().dismiss();

    expect(toast.dismiss).toHaveBeenCalledOnce();
  });

  // triste
  it('shows a failure in red', () => {
    useNotice().show('Não foi possível salvar.', 'danger');

    expect(toast.error).toHaveBeenCalledWith('Não foi possível salvar.');
    expect(toast).not.toHaveBeenCalled();
  });
});
