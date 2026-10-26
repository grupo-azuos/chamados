import { describe, expect, it } from 'vitest';

import {
  formatScheduleEventTime,
  parseGitHubRepo,
  SCHEDULE_END_BEFORE_START,
  SCHEDULE_END_TIME_REQUIRED,
  scheduleEndTimeError,
  softwareProjectStatusLabel,
} from './software-project.util';

describe('software-project.util', () => {
  it('parses GitHub URLs and owner/repo formats correctly', () => {
    // feliz
    expect(parseGitHubRepo('https://github.com/vinicius-gpl/azuos-ticket')).toEqual({
      owner: 'vinicius-gpl',
      repo: 'azuos-ticket',
    });
    expect(parseGitHubRepo('https://github.com/vinicius-gpl/azuos-ticket.git')).toEqual({
      owner: 'vinicius-gpl',
      repo: 'azuos-ticket',
    });
    expect(parseGitHubRepo('vinicius-gpl/azuos-ticket')).toEqual({
      owner: 'vinicius-gpl',
      repo: 'azuos-ticket',
    });

    // triste
    expect(parseGitHubRepo('')).toBeNull();
    expect(parseGitHubRepo('invalid-format')).toBeNull();
    expect(parseGitHubRepo('https://gitlab.com/owner/repo')).toBeNull();
  });

  it('translates status label to pt-BR', () => {
    expect(softwareProjectStatusLabel('active')).toBe('Ativo');
    expect(softwareProjectStatusLabel('maintenance')).toBe('Manutenção');
    expect(softwareProjectStatusLabel('deprecated')).toBe('Legado / Descontinuado');
  });

  it('shows the appointment as a range and the record as a single moment', () => {
    // feliz
    expect(formatScheduleEventTime({ startTime: '16:00', endTime: '17:00' })).toBe('16:00 – 17:00');

    // triste
    expect(formatScheduleEventTime({ startTime: '16:00', endTime: null })).toBe('16:00');
  });

  it('accepts an appointment that ends after it starts, and a record with no end', () => {
    // feliz
    expect(
      scheduleEndTimeError({ kind: 'appointment', startTime: '16:00', endTime: '17:00' }),
    ).toBeNull();
    expect(scheduleEndTimeError({ kind: 'record', startTime: '16:00', endTime: null })).toBeNull();
    /* O fim que sobrou no formulário de um registro não importa. */
    expect(
      scheduleEndTimeError({ kind: 'record', startTime: '16:00', endTime: '10:00' }),
    ).toBeNull();
  });

  it('refuses an appointment without an end, or ending before or when it starts', () => {
    // triste
    expect(scheduleEndTimeError({ kind: 'appointment', startTime: '16:00', endTime: null })).toBe(
      SCHEDULE_END_TIME_REQUIRED,
    );
    expect(
      scheduleEndTimeError({ kind: 'appointment', startTime: '16:00', endTime: '10:00' }),
    ).toBe(SCHEDULE_END_BEFORE_START);
    expect(
      scheduleEndTimeError({ kind: 'appointment', startTime: '16:00', endTime: '16:00' }),
    ).toBe(SCHEDULE_END_BEFORE_START);
  });
});
