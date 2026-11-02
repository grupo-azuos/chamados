import { type MaintenanceSchedule } from '@template/shared/schemas/maintenance.schema';
import { render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '$lib/api/http-client';
import Harness from './use-maintenance-schedule-form-harness.test.svelte';
import {
  type MaintenanceScheduleFormModel,
  toScheduleFormValues,
  toScheduleInput,
} from './use-maintenance-schedule-form.svelte';

vi.mock('$lib/api/maintenances.api', () => ({
  maintenancesApi: { saveSchedule: vi.fn() },
}));

const { maintenancesApi } = await import('$lib/api/maintenances.api');

/* Um dia bem à frente: "hoje" é o relógio de quem agenda, e o teste não pode envelhecer. */
const NEXT_YEAR = `${new Date().getFullYear() + 1}-03-10`;

function schedule(overrides: Partial<MaintenanceSchedule> = {}): MaintenanceSchedule {
  return {
    computerId: 3,
    computerName: 'PC-RECEPCAO-01',
    computerDisplayName: null,
    computerDepartment: 'RECEPÇÃO',
    scheduledFor: NEXT_YEAR,
    note: 'Trocar a pasta térmica.',
    createdAt: '2026-09-01T12:00:00.000Z',
    createdBy: 'ana@empresa.com.br',
    updatedAt: null,
    updatedBy: null,
    ...overrides,
  };
}

function mountModel(
  props: { schedule?: MaintenanceSchedule | null; onSaved?: () => void } = {},
): MaintenanceScheduleFormModel {
  let model!: MaintenanceScheduleFormModel;
  render(Harness, {
    props: { ...props, onReady: (ready: MaintenanceScheduleFormModel) => (model = ready) },
  });

  return model;
}

describe('useMaintenanceScheduleFormModel', () => {
  beforeEach(() => {
    vi.mocked(maintenancesApi.saveSchedule).mockResolvedValue(schedule());
  });

  // feliz
  it('schedules the machine for a day ahead, with the note trimmed', async () => {
    const onSaved = vi.fn();
    const model = mountModel({ onSaved });
    expect(model.data.mode).toBe('create');

    model.actions.onChange('scheduledFor', NEXT_YEAR);
    model.actions.onChange('note', '  Levar o SSD novo. ');
    model.actions.onSubmit();

    await waitFor(() =>
      expect(maintenancesApi.saveSchedule).toHaveBeenCalledWith(3, {
        scheduledFor: NEXT_YEAR,
        note: 'Levar o SSD novo.',
      }),
    );
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
  });

  it('reschedules starting from what is already booked', async () => {
    const model = mountModel({ schedule: schedule() });
    expect(model.data.mode).toBe('edit');
    expect(model.data.fields.note.value).toBe('Trocar a pasta térmica.');

    model.actions.onChange('note', '');
    model.actions.onSubmit();

    await waitFor(() =>
      expect(maintenancesApi.saveSchedule).toHaveBeenCalledWith(3, {
        scheduledFor: NEXT_YEAR,
        note: null,
      }),
    );
  });

  // triste
  it('refuses a day in the past, after leaving the field', async () => {
    const model = mountModel();

    model.actions.onChange('scheduledFor', '2020-01-01');
    model.actions.onBlur('scheduledFor');

    await waitFor(() =>
      expect(model.data.fields.scheduledFor.error).toBe('Escolha hoje ou um dia depois de hoje'),
    );
    model.actions.onSubmit();
    await waitFor(() => expect(model.state.isSubmitting).toBe(false));
    expect(maintenancesApi.saveSchedule).not.toHaveBeenCalled();
  });

  it('shows the error of the server', async () => {
    vi.mocked(maintenancesApi.saveSchedule).mockRejectedValue(new ApiError(422, 'Máquina fora de uso.'));
    const model = mountModel();

    model.actions.onChange('scheduledFor', NEXT_YEAR);
    model.actions.onSubmit();

    await waitFor(() => expect(model.state.error).toBe('Máquina fora de uso.'));
  });
});

describe('schedule form helpers', () => {
  // feliz
  it('opens blank without a booking and filled with one', () => {
    expect(toScheduleFormValues(null)).toEqual({ scheduledFor: '', note: '' });
    expect(toScheduleFormValues(schedule({ note: null }))).toEqual({
      scheduledFor: NEXT_YEAR,
      note: '',
    });
  });

  // triste
  it('sends a blank note as null', () => {
    expect(toScheduleInput({ scheduledFor: NEXT_YEAR, note: '   ' })).toEqual({
      scheduledFor: NEXT_YEAR,
      note: null,
    });
  });
});
