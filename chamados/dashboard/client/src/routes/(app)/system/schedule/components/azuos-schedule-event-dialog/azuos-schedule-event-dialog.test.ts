import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import ScheduleEventDialog, { SWATCHES, swatchOf } from './azuos-schedule-event-dialog.svelte';
import { type SoftwareScheduleFormModel } from '$lib/hooks/use-software-schedule-form/use-software-schedule-form.svelte';

function createMockModel(
  overrides?: Partial<SoftwareScheduleFormModel>,
): SoftwareScheduleFormModel {
  return {
    data: {
      mode: 'create',
      fields: {
        kind: { value: 'appointment', error: null },
        title: { value: 'Deploy Portal v2', error: null },
        category: { value: 'deploy', error: null },
        color: { value: 'blue', error: null },
        date: { value: '2026-10-18', error: null },
        startTime: { value: '09:00', error: null },
        endTime: { value: '10:00', error: null },
        projectId: { value: '', error: null },
        note: { value: '', error: null },
      },
      ...overrides?.data,
    },
    state: {
      isSubmitting: false,
      error: null,
      ...overrides?.state,
    },
    actions: {
      onChange: vi.fn(),
      onBlur: vi.fn(),
      onSubmit: vi.fn(),
      ...overrides?.actions,
    },
  };
}

describe('AzuosScheduleEventDialog', () => {
  it('shows deletion errors inside the open dialog', () => {
    render(ScheduleEventDialog, {
      props: {
        open: true,
        model: createMockModel(),
        projects: [],
        onClose: vi.fn(),
        deleteError: 'Não foi possível excluir o compromisso.',
      },
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível excluir o compromisso.');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('renders modal when open', () => {
    const model = createMockModel();
    render(ScheduleEventDialog, {
      props: {
        open: true,
        model,
        projects: [],
        onClose: vi.fn(),
      },
    });

    expect(screen.getByText('Novo Compromisso')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Título do compromisso/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Data' })).toHaveTextContent('18 de out. de 2026');
    expect(screen.getByRole('button', { name: 'Início' })).toHaveTextContent('09:00');
    expect(screen.getByRole('button', { name: 'Fim' })).toHaveTextContent('10:00');
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    const model = createMockModel();
    render(ScheduleEventDialog, {
      props: {
        open: true,
        model,
        projects: [],
        onClose,
      },
    });

    const closeBtn = screen.getByRole('button', { name: 'Fechar diálogo' });
    await userEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });

  // feliz
  it('asks only for the time and the description when it is a record', () => {
    const model = createMockModel();
    model.data.fields.kind = { value: 'record', error: null };
    render(ScheduleEventDialog, { props: { open: true, model, projects: [], onClose: vi.fn() } });

    expect(screen.getByText('Novo Registro')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hora' })).toHaveTextContent('09:00');
    expect(screen.queryByRole('button', { name: 'Fim' })).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Descrição' }).tagName).toBe('TEXTAREA');
    expect(screen.getByRole('button', { name: 'Salvar registro' })).toBeInTheDocument();
  });

  // triste
  it('shows the title error and the save error so the person knows what to fix', () => {
    const model = createMockModel({
      state: { isSubmitting: false, error: 'Não foi possível falar com o servidor.' },
    });
    model.data.fields.title = { value: '', error: 'Informe o título do compromisso' };
    render(ScheduleEventDialog, { props: { open: true, model, projects: [], onClose: vi.fn() } });

    expect(screen.getByText('Informe o título do compromisso')).toBeInTheDocument();
    expect(screen.getByText('Não foi possível falar com o servidor.')).toBeInTheDocument();
  });

  // feliz
  it('switches between appointment and record', async () => {
    const model = createMockModel();
    render(ScheduleEventDialog, { props: { open: true, model, projects: [], onClose: vi.fn() } });

    await userEvent.click(screen.getByRole('button', { name: 'Registro' }));

    expect(model.actions.onChange).toHaveBeenCalledWith('kind', 'record');
  });
});

describe('swatchOf', () => {
  // feliz
  it('offers all eight colors, none repeated', () => {
    const dots = SWATCHES.map((swatch) => swatch.dotClass);

    expect(SWATCHES).toHaveLength(8);
    expect(new Set(dots).size).toBe(dots.length);
  });

  // feliz
  it('paints pink as pink and amber as yellow — the colors their names promise', () => {
    expect(swatchOf('rose')).toMatchObject({ label: 'Rosa', dotClass: 'bg-tag-rose' });
    expect(swatchOf('amber')).toMatchObject({ label: 'Amarelo', dotClass: 'bg-tag-amber' });
    expect(swatchOf('indigo').dotClass).not.toBe(swatchOf('purple').dotClass);
  });

  // triste
  it('falls back to blue for an unknown color', () => {
    expect(swatchOf('chartreuse').label).toBe('Azul');
  });
});

describe('AzuosScheduleEventDialog color', () => {
  // feliz
  it('marks the chosen swatch and names it next to the label', () => {
    const model = createMockModel();
    model.data.fields.color.value = 'rose';
    render(ScheduleEventDialog, {
      props: { open: true, model, projects: [], onClose: vi.fn() },
    });

    expect(screen.getByRole('button', { name: 'Rosa' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Amarelo' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText(/· Rosa/)).toBeInTheDocument();
  });

  // triste
  it('marks only one swatch even for a color it does not know', () => {
    const model = createMockModel();
    model.data.fields.color.value = 'chartreuse';
    render(ScheduleEventDialog, {
      props: { open: true, model, projects: [], onClose: vi.fn() },
    });

    const pressed = screen
      .getAllByRole('button')
      .filter((button) => button.getAttribute('aria-pressed') === 'true');
    expect(pressed.map((button) => button.getAttribute('aria-label'))).toContain('Azul');
  });
});
