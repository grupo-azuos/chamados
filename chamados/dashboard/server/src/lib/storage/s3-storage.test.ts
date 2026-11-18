import { NoSuchKey, NotFound, S3Client } from '@aws-sdk/client-s3';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { attachmentDisposition, S3Storage, type S3StorageOptions, signAs } from './s3-storage';

const OPTIONS: S3StorageOptions = {
  bucket: 'chamados',
  region: 'local',
  endpoint: 'http://10.0.0.5:8001/storage/v1/s3',
  accessKeyId: 'access',
  secretAccessKey: 'secret',
  forcePathStyle: true,
};

/* A assinatura depende do relógio: congelado, duas URLs do mesmo pedido saem iguais. */
async function frozen<T>(run: () => Promise<T>): Promise<T> {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-15T12:00:00Z'));

  return run().finally(() => vi.useRealTimers());
}

afterEach(() => vi.restoreAllMocks());

describe('S3Storage URLs', () => {
  // feliz
  it('signs an upload URL for the bucket, at the endpoint', async () => {
    const url = new URL(await new S3Storage(OPTIONS).uploadUrl('tmp/a.pdf', 300));

    expect(url.origin).toBe('http://10.0.0.5:8001');
    expect(url.pathname).toBe('/storage/v1/s3/chamados/tmp/a.pdf');
    expect(url.searchParams.get('X-Amz-Expires')).toBe('300');
    expect(url.searchParams.get('X-Amz-Signature')).toMatch(/^[0-9a-f]{64}$/);
  });

  // feliz
  it('asks the storage to save the file with its original name when downloading', async () => {
    const url = new URL(
      await new S3Storage(OPTIONS).downloadUrl('k.pdf', 120, 'Nota fiscal da peça.pdf'),
    );

    expect(url.searchParams.get('response-content-disposition')).toBe(
      attachmentDisposition('Nota fiscal da peça.pdf'),
    );
  });

  // feliz
  it('with signingHost, signs for that host but keeps the endpoint address', async () => {
    const [swapped, reference] = await frozen(() =>
      Promise.all([
        new S3Storage({ ...OPTIONS, signingHost: '10.0.0.5:8000' }).uploadUrl('tmp/a.pdf', 300),
        new S3Storage({ ...OPTIONS, endpoint: 'http://10.0.0.5:8000/storage/v1/s3' }).uploadUrl(
          'tmp/a.pdf',
          300,
        ),
      ]),
    );

    expect(new URL(swapped).origin).toBe('http://10.0.0.5:8001');
    expect(new URL(swapped).searchParams.get('X-Amz-Signature')).toBe(
      new URL(reference).searchParams.get('X-Amz-Signature'),
    );
  });

  // triste
  it('a URL only for opening carries no download name', async () => {
    const url = new URL(await new S3Storage(OPTIONS).downloadUrl('k.pdf', 120, null));

    expect(url.searchParams.has('response-content-disposition')).toBe(false);
  });
});

describe('S3Storage calls', () => {
  // feliz
  it('moves by copying inside the storage and removing the original, with the key encoded', async () => {
    const send = vi.spyOn(S3Client.prototype, 'send').mockResolvedValue({} as never);

    await new S3Storage(OPTIONS).move('tmp/a.pdf', 'ticket-attachments/3 (Licenca).pdf');

    const [copy, remove] = send.mock.calls.map(([command]) => (command as { input: object }).input);
    expect(copy).toMatchObject({
      Bucket: 'chamados',
      Key: 'ticket-attachments/3 (Licenca).pdf',
      CopySource: 'chamados/tmp/a.pdf',
    });
    expect(remove).toMatchObject({
      Bucket: 'chamados',
      Delete: { Objects: [{ Key: 'tmp/a.pdf' }] },
    });
  });

  // feliz
  it('lists page by page until enough files pass the filter', async () => {
    const old = new Date('2026-10-01T00:00:00Z');
    const recent = new Date('2026-10-15T00:00:00Z');
    vi.spyOn(S3Client.prototype, 'send')
      .mockResolvedValueOnce({
        Contents: [
          { Key: 'tmp/a', LastModified: recent },
          { Key: 'tmp/b', LastModified: old },
        ],
        IsTruncated: true,
        NextContinuationToken: 't2',
      } as never)
      .mockResolvedValueOnce({
        Contents: [{ Key: 'tmp/c', LastModified: old }],
        IsTruncated: false,
      } as never);

    const found = await new S3Storage(OPTIONS).list(
      'tmp/',
      10,
      (file) => file.lastModified! < recent,
    );

    expect(found.map((file) => file.key)).toEqual(['tmp/b', 'tmp/c']);
  });

  // triste
  it('answers null for a missing file, from GET (NoSuchKey) and from HEAD (NotFound)', async () => {
    vi.spyOn(S3Client.prototype, 'send')
      .mockRejectedValueOnce(new NoSuchKey({ message: 'no key', $metadata: {} }))
      .mockRejectedValueOnce(new NotFound({ message: 'not found', $metadata: {} }));
    const storage = new S3Storage(OPTIONS);

    expect(await storage.get('tmp/gone.pdf')).toBeNull();
    expect(await storage.head('tmp/gone.pdf')).toBeNull();
  });

  // triste
  it('does not take a storage outage for a missing file', async () => {
    vi.spyOn(S3Client.prototype, 'send').mockRejectedValue(new TypeError('fetch failed'));

    await expect(new S3Storage(OPTIONS).get('tmp/a.pdf')).rejects.toThrow('fetch failed');
  });
});

describe('attachmentDisposition', () => {
  it('keeps the accented name for modern browsers and a plain one as fallback', () => {
    expect(attachmentDisposition('Licença "nova".pdf')).toBe(
      `attachment; filename="Licenca _nova_.pdf"; filename*=UTF-8''Licen%C3%A7a%20%22nova%22.pdf`,
    );
  });
});

describe('S3Storage reads and writes', () => {
  // feliz
  it('reads a file with its type, and without a type when the storage did not keep one', async () => {
    const body = { transformToByteArray: async () => new Uint8Array([1, 2, 3]) };
    vi.spyOn(S3Client.prototype, 'send')
      .mockResolvedValueOnce({ Body: body, ContentType: 'application/pdf' } as never)
      .mockResolvedValueOnce({ Body: body } as never)
      .mockResolvedValueOnce({} as never);
    const storage = new S3Storage(OPTIONS);

    expect(await storage.get('tmp/a.pdf')).toEqual({
      content: Buffer.from([1, 2, 3]),
      contentType: 'application/pdf',
    });
    expect((await storage.get('tmp/b.bin'))?.contentType).toBeNull();
    /* Resposta sem corpo: para o storage o arquivo não está lá. */
    expect(await storage.get('tmp/c.bin')).toBeNull();
  });

  it('saves the file with the type it came with, or without one', async () => {
    const send = vi.spyOn(S3Client.prototype, 'send').mockResolvedValue({} as never);
    const storage = new S3Storage(OPTIONS);

    await storage.put('inventory/foto.webp', Buffer.from('x'), 'image/webp');
    await storage.put('inventory/sem-tipo', Buffer.from('x'), null);

    const inputs = send.mock.calls.map(([command]) => (command as { input: object }).input);
    expect(inputs[0]).toMatchObject({ Key: 'inventory/foto.webp', ContentType: 'image/webp' });
    expect(inputs[1]).toMatchObject({ Key: 'inventory/sem-tipo', ContentType: undefined });
  });

  it('measures a file by its head, with nulls for what the storage did not say', async () => {
    vi.spyOn(S3Client.prototype, 'send')
      .mockResolvedValueOnce({ ContentLength: 42, ContentType: 'image/png' } as never)
      .mockResolvedValueOnce({} as never);
    const storage = new S3Storage(OPTIONS);

    expect(await storage.head('tmp/a.png')).toEqual({ size: 42, contentType: 'image/png' });
    expect(await storage.head('tmp/b')).toEqual({ size: null, contentType: null });
  });

  it('skips listed objects without a key and reads a missing date as null', async () => {
    vi.spyOn(S3Client.prototype, 'send').mockResolvedValueOnce({
      Contents: [{ Key: 'tmp/a' }, { LastModified: new Date() }],
      IsTruncated: false,
    } as never);

    expect(await new S3Storage(OPTIONS).list('tmp/', 10, () => true)).toEqual([
      { key: 'tmp/a', lastModified: null },
    ]);
  });

  it('removes nothing when there is nothing to remove', async () => {
    const send = vi.spyOn(S3Client.prototype, 'send').mockResolvedValue({} as never);

    await new S3Storage(OPTIONS).remove([]);

    expect(send).not.toHaveBeenCalled();
  });

  // triste
  it('does not take a storage outage on HEAD for a missing file', async () => {
    vi.spyOn(S3Client.prototype, 'send').mockRejectedValue(new TypeError('fetch failed'));

    await expect(new S3Storage(OPTIONS).head('tmp/a.pdf')).rejects.toThrow('fetch failed');
  });

  it('signs for the configured host only when the request carries headers', async () => {
    type Middleware = (
      next: (args: unknown) => Promise<unknown>,
    ) => (args: unknown) => Promise<unknown>;
    let captured: Middleware | undefined;
    const client = {
      middlewareStack: {
        add: (middleware: Middleware) => {
          captured = middleware;
        },
      },
    } as unknown as S3Client;

    signAs(client, 'storage.interno:9000');
    const handler = captured!(async (args) => args);

    const signed = (await handler({ request: { headers: {} } })) as {
      request: { headers: Record<string, string> };
    };
    expect(signed.request.headers.host).toBe('storage.interno:9000');

    const bare = (await handler({ request: {} })) as { request: { headers?: unknown } };
    expect(bare.request.headers).toBeUndefined();
  });
});
