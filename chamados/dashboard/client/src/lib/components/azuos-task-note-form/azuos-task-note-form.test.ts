import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import TaskNoteForm from './azuos-task-note-form.svelte';

function setup(value: string, error: string | null = null) {
  const onChange = vi.fn();
  const onSubmit = vi.fn();
  render(TaskNoteForm, {
    props: {
      data: { value, maxLength: 500 },
      state: { isSaving: false, error },
      actions: { onChange, onSubmit },
    },
  });

  return { onChange, onSubmit };
}

describe('AzuosTaskNoteForm', () => {
  // feliz
  it('reports what is typed and asks to save the note', async () => {
    const { onChange, onSubmit } = setup('Troquei a fonte.');

    await userEvent.type(screen.getByLabelText('Anotação'), '!');
    await userEvent.click(screen.getByRole('button', { name: 'Anotar' }));

    expect(onChange).toHaveBeenCalledWith('Troquei a fonte.!');
    expect(onSubmit).toHaveBeenCalled();
  });

  // triste
  it('does not save an empty note, and shows the refusal', () => {
    setup('   ', 'Seu cargo nesta área só permite consultar.');

    expect(screen.getByRole('button', { name: 'Anotar' })).toBeDisabled();
    expect(screen.getByText('Seu cargo nesta área só permite consultar.')).toBeInTheDocument();
  });
});
