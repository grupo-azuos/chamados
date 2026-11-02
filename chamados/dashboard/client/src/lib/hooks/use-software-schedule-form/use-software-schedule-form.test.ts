import { type SoftwareScheduleEvent } from '@template/shared/schemas/software-schedule.schema';
import { render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '$lib/api/http-client';
import Harness from './use-software-schedule-form-harness.test.svelte';
import {
  oneHourAfter,
  type SoftwareScheduleFormModel,
  toScheduleEventPayload,
  toScheduleFormValue,
} from './use-software-schedule-form.svelte';

vi.mock('$lib/api/software-schedule.api', () => ({
  softwareScheduleApi: { create: vi.fn(), update: vi.fn() },
}));

const { softwareScheduleApi } = await import('$lib/api/software-schedule.api');

function event(overrides: Partial<SoftwareScheduleEvent> = {}): SoftwareScheduleEvent {
  return {
    id: 1,
    projectId: 2,
    projectName: 'Chamados',
    kind: 'appointment',
    title: 'Deploy',
    category: 'deploy',
    color: 'blue',
    date: '2026-10-20',
    startTime: '09:00',
    endTime: '10:00',
    note: null,
    createdAt: '2026-10-01T12:00:00.000Z',
    createdById: 'u-dora',
    createdByEmail: 'dora@empresa.com.br',
    createdByName: 'Dora',
    ...overrides,
  };
}

type Props = {
  event?: SoftwareScheduleEvent | null;
  defaultDate?: string;
  defaultStartTime?: string;
  onSaved?: () => void;
};

function mountModel(props: Props = {}): SoftwareScheduleFormModel {
  let model!: SoftwareScheduleFormModel;
  render(Harness, {
    props: { ...props, onReady: (ready: SoftwareScheduleFormModel) => (model = ready) },
  });

  return model;
}

describe('useSoftwareScheduleFormModel', () => {
  beforeEach(() => {
    vi.mocked(softwareScheduleApi.create).mockResolvedValue(event());
    vi.mocked(softwareScheduleApi.update).mockResolvedValue(event());
  });

  // feliz
  it('starts on the clicked slot, one hour long, and saves the appointment', async () => {
    const onSaved = vi.fn();
    const model = mountModel({ defaultDate: '2026-10-22', defaultStartTime: '14:30', onSaved });
    expect(model.data.mode).toBe('create');
    expect(model.data.fields.date.value).toBe('2026-10-22');
    expect(model.data.fields.endTime.value).toBe('15:30');
    expect(model.data.fields.projectId.value).toBe('');

    model.actions.onChange('title', 'Revisão do PR');
    model.actions.onChange('projectId', '2');
    model.actions.onChange('note', '  Levar o checklist ');
    model.actions.onSubmit();

    await waitFor(() =>
      expect(softwareScheduleApi.create).toHaveBeenCalledWith({
        kind: 'appointment',
        title: 'Revisão do PR',
        category: 'other',
        color: 'blue',
        date: '2026-10-22',
        startTime: '14:30',
        endTime: '15:30',
        projectId: 2,
        note: 'Levar o checklist',
      }),
    );
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(model.data.fields.projectId.value).toBe('2');
  });

  it('edits the existing item, and a record goes without an end', async () => {
    const model = mountModel({ event: event({ kind: 'record', endTime: null }) });
    expect(model.data.mode).toBe('edit');
    /* Registro sem fim: o formulário guarda uma hora depois, caso vire compromisso. */
    expect(model.data.fields.endTime.value).toBe('10:00');

    model.actions.onChange('projectId', '');
    model.actions.onSubmit();

    await waitFor(() =>
      expect(softwareScheduleApi.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ kind: 'record', endTime: null, projectId: null, note: null }),
      ),
    );
  });

  it('defaults to today when nothing was clicked', () => {
    const model = mountModel();

    expect(model.data.fields.date.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(model.data.fields.startTime.value).toBe('09:00');
  });

  // triste
  it('refuses an end before the start and a blank title', async () => {
    const model = mountModel();

    model.actions.onChange('endTime', '08:00');
    model.actions.onBlur('title');
    model.actions.onSubmit();

    await waitFor(() => expect(model.data.fields.title.error).toBe('Informe o título do compromisso'));
    expect(model.data.fields.endTime.error).toBeTruthy();
    expect(softwareScheduleApi.create).not.toHaveBeenCalled();
  });

  it('shows the error of the server', async () => {
    vi.mocked(softwareScheduleApi.create).mockRejectedValue(new ApiError(403, 'Só quem lançou.'));
    const model = mountModel();

    model.actions.onChange('title', 'X');
    model.actions.onSubmit();

    await waitFor(() => expect(model.state.error).toBe('Só quem lançou.'));
  });
});

describe('schedule form helpers', () => {
  // feliz
  it('adds one hour, stopping at the end of the day', () => {
    expect(oneHourAfter('09:00')).toBe('10:00');
    expect(oneHourAfter('23:15')).toBe('23:59');
    expect(oneHourAfter('')).toBe('01:00');
  });

  it('turns the system id into a number, or null for "none"', () => {
    expect(toScheduleFormValue('projectId', '3')).toBe(3);
    expect(toScheduleFormValue('projectId', '')).toBeNull();
    expect(toScheduleFormValue('title', 'x')).toBe('x');
  });

  // triste
  it('builds the payload without an end for a record', () => {
    expect(
      toScheduleEventPayload({
        kind: 'record',
        title: 'Incidente',
        category: 'other',
        color: 'red',
        date: '2026-10-20',
        startTime: '09:00',
        endTime: '10:00',
        projectId: null,
        note: '',
      }),
    ).toMatchObject({ endTime: null, projectId: null, note: null });
  });
});
