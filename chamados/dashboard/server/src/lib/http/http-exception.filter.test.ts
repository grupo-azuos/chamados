import { type ArgumentsHost, BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { HttpExceptionFilter } from './http-exception.filter';

/** O par requisição/resposta do Express, só com o que o filtro toca. */
function fakeHost(url: string | null) {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => (url === null ? {} : { url }),
    }),
  } as unknown as ArgumentsHost;

  return { host, status, json };
}

function bodyOf(exception: unknown, url: string | null = '/api/x') {
  const { host, status, json } = fakeHost(url);
  new HttpExceptionFilter().catch(exception, host);

  return { statusCode: status.mock.calls[0]?.[0], body: json.mock.calls[0]?.[0] };
}

describe('HttpExceptionFilter', () => {
  // feliz
  it('turns a Zod refusal into 422 with one line per field', () => {
    const parsed = z.object({ name: z.string().min(1, 'Informe o nome') }).safeParse({ name: '' });
    const { statusCode, body } = bodyOf(parsed.success ? null : parsed.error);

    expect(statusCode).toBe(422);
    expect(body).toMatchObject({
      message: 'Confira os campos destacados.',
      details: [{ field: 'name', message: 'Informe o nome' }],
      path: '/api/x',
    });
  });

  it('keeps the message of an HTTP exception, whether text, object or list', () => {
    expect(bodyOf(new NotFoundException('Peça não encontrada.')).body).toMatchObject({
      statusCode: 404,
      message: 'Peça não encontrada.',
    });
    expect(bodyOf(new BadRequestException(['a', 'b'])).body.message).toBe('a; b');
    expect(bodyOf(new BadRequestException({ message: 'Texto' })).body.message).toBe('Texto');
    /* Sem mensagem no corpo: vale a da exceção. */
    expect(bodyOf(new BadRequestException({})).body.message).toBe('Bad Request Exception');
  });

  it('reads the per-field details the zod pipe sends, ignoring what is not an issue', () => {
    const { body } = bodyOf(
      new BadRequestException({
        message: 'Validation failed',
        errors: [{ path: ['quantity'], message: 'Informe a quantidade' }, 'lixo', null, { x: 1 }],
      }),
    );

    expect(body).toMatchObject({
      message: 'Confira os campos destacados.',
      details: [{ field: 'quantity', message: 'Informe a quantidade' }],
    });
  });

  // triste
  it('hides the text of an unexpected error and logs it with the stack', () => {
    const { body, statusCode } = bodyOf(new Error('senha=123'));

    expect(statusCode).toBe(500);
    expect(body.message).not.toContain('senha');
  });

  it('survives an error that is not an Error and a request without a path', () => {
    const { body } = bodyOf('estourou', null);

    expect(body).toMatchObject({ statusCode: 500, path: '' });
  });

  it('keeps an empty details list out of the way', () => {
    const { body } = bodyOf(new BadRequestException({ message: 'Nada', errors: [] }));

    expect(body.message).toBe('Nada');
    expect(body.details).toBeUndefined();
  });
});
