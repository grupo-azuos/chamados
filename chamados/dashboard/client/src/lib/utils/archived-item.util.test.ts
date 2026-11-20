import { type Maintenance, type MaintenanceSchedule } from '@template/shared/schemas/maintenance.schema';
import { describe, expect, it } from 'vitest';

import {
  archivedMaintenanceItem,
  archivedScheduleItem,
  archivedScheduleWindow,
  parseTicketRemovedKey,
  ticketRemovedItem,
  ticketRemovedKey,
} from './archived-item.util';

const ARCHIVED = { archivedAt: '2026-11-20T12:00:00.000Z', archivedBy: 'u-ana' };

const maintenance = {
  id: 4,
  computerId: null,
  computerName: null,
  computerDisplayName: null,
  otherMachine: 'Impressora da recepção',
  type: 'preventive',
  archive: ARCHIVED,
} as Maintenance;

describe('archived items', () => {
  // feliz
  it('names the maintenance by the machine and the kind by the type', () => {
    expect(archivedMaintenanceItem(maintenance)).toEqual({
      key: '4',
      label: 'Impressora da recepção',
      kind: 'Preventiva',
      archivedAt: ARCHIVED.archivedAt,
      canRestore: true,
    });
  });

  // feliz
  it('names a closed schedule by the machine and the day it was for', () => {
    const schedule = {
      id: 8,
      computerName: 'CONTABIL-03',
      computerDisplayName: null,
      scheduledFor: '2026-11-05',
      archive: ARCHIVED,
    } as MaintenanceSchedule;

    expect(archivedScheduleItem(schedule).label).toBe('CONTABIL-03 — 05/11/2026');
  });

  // feliz
  it('keeps the server answer on who can undo a ticket item', () => {
    const item = ticketRemovedItem({
      kind: 'attachment',
      id: 9,
      label: 'print.png',
      archivedAt: ARCHIVED.archivedAt,
      canRestore: false,
    });

    expect(item).toMatchObject({ key: 'attachment:9', kind: 'Anexo', canRestore: false });
  });

  // feliz
  it('reads the ticket key back into kind and id', () => {
    expect(parseTicketRemovedKey(ticketRemovedKey({ kind: 'stock_item', id: 5 }))).toEqual({
      kind: 'stock_item',
      id: 5,
    });
  });

  // triste
  it('refuses a key that is not from a ticket', () => {
    expect(parseTicketRemovedKey('ticket:1')).toBeNull();
    expect(parseTicketRemovedKey('attachment:abc')).toBeNull();
    expect(parseTicketRemovedKey('')).toBeNull();
  });

  // triste
  it('falls back to a placeholder when the maintenance has no machine name', () => {
    expect(archivedMaintenanceItem({ ...maintenance, otherMachine: null }).label).toBe('(Sem máquina)');
  });
});

describe('archivedScheduleWindow', () => {
  // feliz
  it('looks six months back and a year ahead of today', () => {
    expect(archivedScheduleWindow(new Date(2026, 10, 20, 12))).toEqual({
      startDate: '2026-05-24',
      endDate: '2027-11-20',
    });
  });

  // triste
  it('crosses the year boundary without losing the day', () => {
    expect(archivedScheduleWindow(new Date(2026, 0, 1, 12)).startDate).toBe('2025-07-05');
  });
});
