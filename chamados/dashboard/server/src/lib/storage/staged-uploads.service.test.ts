import { NotFoundException } from '@nestjs/common';
import { STAGING_KEY_PATTERN } from '@template/shared/schemas/staged-file.schema';
import { describe, expect, it, vi } from 'vitest';

import { MemoryStorage } from './memory-storage';
import { StagedUploadsService } from './staged-uploads.service';

const STAGED = {
  storageKey: 'tmp/00000000-0000-4000-8000-000000000001.pdf',
  fileName: 'Nota fiscal.pdf',
};

function setup() {
  const storage = new MemoryStorage();

  return { storage, staging: new StagedUploadsService(storage) };
}

describe('StagedUploadsService', () => {
  // feliz
  it('hands out a staging key and a short-lived upload link', async () => {
    const { staging } = setup();

    const ticket = await staging.createUploadTicket('Nota fiscal.pdf');

    expect(STAGING_KEY_PATTERN.test(ticket.storageKey)).toBe(true);
    expect(ticket.uploadUrl).toBe(`memory://upload/${ticket.storageKey}?expires=300`);
    expect(ticket.expiresIn).toBe(300);
  });

  // feliz
  it('measures the file the storage really has, not what the screen promised', async () => {
    const { storage, staging } = setup();
    await storage.put(STAGED.storageKey, Buffer.alloc(2048), 'application/pdf');

    expect(await staging.inspect(STAGED)).toEqual({
      ...STAGED,
      contentType: 'application/pdf',
      sizeBytes: 2048,
    });
  });

  // feliz
  it('moves the file out of the staging area into the feature folder', async () => {
    const { storage, staging } = setup();
    await storage.put(STAGED.storageKey, Buffer.from('pdf'), 'application/pdf');

    const key = await staging.promote(STAGED, 'ticket-attachments');

    expect(key).toMatch(/^ticket-attachments\/[0-9a-f-]{36}\.pdf$/);
    expect(await storage.head(STAGED.storageKey)).toBeNull();
    expect(await storage.head(key)).not.toBeNull();
  });

  // triste
  it('refuses a file that never reached the storage, naming it', async () => {
    const { staging } = setup();

    const refused = staging.inspect(STAGED);

    await expect(refused).rejects.toThrow(NotFoundException);
    await expect(refused).rejects.toThrow('Nota fiscal.pdf');
  });

  // triste
  it('does not take a storage outage for a missing file', async () => {
    const { storage, staging } = setup();
    vi.spyOn(storage, 'head').mockRejectedValue(new TypeError('fetch failed'));

    await expect(staging.inspect(STAGED)).rejects.toThrow('fetch failed');
  });

  // triste
  it('keeps going when discarding fails: the leftover goes to the log', async () => {
    const { storage, staging } = setup();
    vi.spyOn(storage, 'remove').mockRejectedValue(new TypeError('fetch failed'));

    await expect(staging.discard([STAGED.storageKey])).resolves.toBeUndefined();
  });

  // feliz
  it('sweeps only what was abandoned in the staging area for more than a day', async () => {
    const { storage, staging } = setup();
    const now = new Date('2026-10-16T12:00:00Z');
    await storage.put('tmp/old.pdf', Buffer.from('a'), null, new Date('2026-10-15T00:00:00Z'));
    await storage.put('tmp/fresh.pdf', Buffer.from('b'), null, new Date('2026-10-16T11:00:00Z'));
    await storage.put(
      'ticket-attachments/kept.pdf',
      Buffer.from('c'),
      null,
      new Date('2026-01-01'),
    );

    expect(await staging.sweep(now)).toBe(1);
    expect(await storage.head('tmp/old.pdf')).toBeNull();
    expect(await storage.head('tmp/fresh.pdf')).not.toBeNull();
    expect(await storage.head('ticket-attachments/kept.pdf')).not.toBeNull();
  });

  // triste
  it('a storage outage during the sweep goes to the log, not up', async () => {
    const { storage, staging } = setup();
    vi.spyOn(storage, 'list').mockRejectedValue(new TypeError('fetch failed'));

    await expect(staging.sweep(new Date())).resolves.toBe(0);
  });
});

describe('StagedUploadsService: the edges', () => {
  // feliz
  it('fills what the storage could not measure with the unknown type and zero bytes', async () => {
    const storage = {
      head: vi.fn().mockResolvedValue({ size: null, contentType: '' }),
    };
    const staging = new StagedUploadsService(storage as never);

    await expect(staging.inspect(STAGED)).resolves.toMatchObject({
      contentType: 'application/octet-stream',
      sizeBytes: 0,
    });
  });

  it('keeps sweeping while a round comes back full, and stops at the cap', async () => {
    const full = Array.from({ length: 500 }, (_, index) => ({
      key: `tmp/${index}`,
      lastModified: new Date(0),
    }));
    const storage = {
      list: vi.fn().mockResolvedValue(full),
      remove: vi.fn().mockResolvedValue(undefined),
    };
    const staging = new StagedUploadsService(storage as never);

    const removed = await staging.sweep(new Date());

    expect(removed).toBe(500 * 20);
    expect(storage.remove).toHaveBeenCalledTimes(20);
  });

  it('schedules the sweep on start and stops it on shutdown', () => {
    vi.useFakeTimers();
    try {
      const storage = { list: vi.fn().mockResolvedValue([]), remove: vi.fn() };
      const staging = new StagedUploadsService(storage as never);

      staging.onModuleInit();
      vi.advanceTimersByTime(60 * 60 * 1000);
      expect(storage.list).toHaveBeenCalledTimes(1);

      staging.onModuleDestroy();
      vi.advanceTimersByTime(60 * 60 * 1000);
      expect(storage.list).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  // triste
  it('does nothing when asked to discard nothing', async () => {
    const storage = { remove: vi.fn() };
    const staging = new StagedUploadsService(storage as never);

    await staging.discard([]);

    expect(storage.remove).not.toHaveBeenCalled();
  });

  it('logs a failure that is not an Error, on discard and on sweep', async () => {
    const storage = {
      remove: vi.fn().mockRejectedValue('caiu'),
      list: vi.fn().mockRejectedValue('caiu'),
    };
    const staging = new StagedUploadsService(storage as never);

    await expect(staging.discard(['tmp/a'])).resolves.toBeUndefined();
    await expect(staging.sweep(new Date())).resolves.toBe(0);
  });
});
