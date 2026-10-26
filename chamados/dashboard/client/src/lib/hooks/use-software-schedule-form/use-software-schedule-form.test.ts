import { describe, expect, it } from 'vitest';

import { oneHourAfter, toScheduleEventPayload } from './use-software-schedule-form.svelte';

describe('oneHourAfter', () => {
  // feliz
  it('ends a new appointment one hour after it starts', () => {
    expect(oneHourAfter('09:00')).toBe('10:00');
    expect(oneHourAfter('14:30')).toBe('15:30');
  });

  // triste
  /* Perto da meia-noite o fim não pode virar o dia seguinte. */
  it('stops at the end of the day', () => {
    expect(oneHourAfter('23:15')).toBe('23:59');
  });
});

describe('toScheduleEventPayload', () => {
  const values = {
    kind: 'appointment' as const,
    title: 'Deploy do portal',
    category: 'deploy' as const,
    color: 'blue' as const,
    date: '2026-10-26',
    startTime: '16:00',
    endTime: '17:00',
    projectId: 2,
    note: '  Enviado para o usuário testar  ',
  };

  // feliz
  it('sends the appointment with its end time and the trimmed description', () => {
    expect(toScheduleEventPayload(values)).toMatchObject({
      kind: 'appointment',
      endTime: '17:00',
      note: 'Enviado para o usuário testar',
    });
  });

  // triste
  /* O fim continua no formulário (para o caso de voltar a compromisso), mas não vai para a API. */
  it('drops the end time of a record', () => {
    expect(toScheduleEventPayload({ ...values, kind: 'record', note: '' })).toMatchObject({
      kind: 'record',
      endTime: null,
      note: null,
    });
  });
});
