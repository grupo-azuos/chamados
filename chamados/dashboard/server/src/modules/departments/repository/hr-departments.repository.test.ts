import { afterEach, describe, expect, it, vi } from 'vitest';

import { type Env } from '../../../lib/config/env.schema';
import { HrDepartmentsRepository } from './hr-departments.repository';

const env = {
  ADMIN_CONSOLE_URL: 'http://admin-console:3000/',
  ADMIN_CONSOLE_TOKEN: 'um_chamados_segredo-de-teste',
  ADMIN_CONSOLE_TIMEOUT_MS: 4_000,
} as Env;

function answer(body: unknown, status = 200) {
  return vi.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify(body), { status }));
}

afterEach(() => vi.restoreAllMocks());

describe('HrDepartmentsRepository', () => {
  // feliz
  it('reads the HR departments through the admin-console, with the service token', async () => {
    const fetcher = answer({
      data: {
        organizationOptions: {
          isAvailable: true,
          jobTitles: [],
          departments: [
            { id: 2, name: 'Recursos Humanos' },
            { id: 1, name: ' Fiscal ' },
            { id: 3, name: 'Fiscal' },
          ],
        },
      },
    });

    await expect(new HrDepartmentsRepository(env).listNames()).resolves.toEqual([
      'Fiscal',
      'Recursos Humanos',
    ]);
    const [url, init] = fetcher.mock.calls[0] ?? [];
    expect(String(url)).toBe('http://admin-console:3000/api/systems/me/organization-options');
    expect((init?.headers as Record<string, string>).authorization).toBe(
      'Bearer um_chamados_segredo-de-teste',
    );
  });

  // triste
  /* RH fora do ar chega como 200 com lista vazia: tratar como vazio apagaria os departamentos. */
  it('fails, instead of answering empty, when the HR lists are unavailable', async () => {
    answer({ data: { organizationOptions: { isAvailable: false, jobTitles: [], departments: [] } } });

    await expect(new HrDepartmentsRepository(env).listNames()).rejects.toThrow('unavailable');
  });

  it('fails when the admin-console refuses the token', async () => {
    answer({ message: 'Forbidden' }, 403);

    await expect(new HrDepartmentsRepository(env).listNames()).rejects.toThrow('403');
  });

  it('fails without calling anyone when the admin-console address is missing', async () => {
    const fetcher = vi.spyOn(global, 'fetch');

    await expect(
      new HrDepartmentsRepository({ ...env, ADMIN_CONSOLE_URL: undefined } as Env).listNames(),
    ).rejects.toThrow('ADMIN_CONSOLE_URL');
    expect(fetcher).not.toHaveBeenCalled();
  });
});
