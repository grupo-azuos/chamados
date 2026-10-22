import { Inject, Injectable } from '@nestjs/common';

import { type Env } from '../../../lib/config/env.schema';
import { ENV } from '../../../lib/config/env.token';

/** O pedaço da resposta do admin-console que importa aqui. */
type OrganizationOptionsResponse = {
  data?: {
    organizationOptions?: {
      isAvailable?: unknown;
      departments?: unknown;
    };
  };
};

/**
 * A lista "Departamentos" do sistema de Gestão de RH, pela API — nunca pelo banco dele.
 *
 * Quem pergunta ao RH é o ADMIN-CONSOLE: a API do RH só aceita o vínculo dele, e só pela rede
 * interna. Ele repassa a lista em `GET /api/systems/me/organization-options`, com o mesmo token
 * de serviço que este sistema já usa para o diretório de pessoas (`ADMIN_CONSOLE_TOKEN`) —
 * nenhuma configuração nova, e o schema do RH continua sendo só do RH.
 *
 * Falha LANÇA em vez de devolver lista vazia: quem decide o que fazer é o `DepartmentsService`,
 * que segue com a última lista lida. Vazio aqui diria "o RH não tem departamento nenhum".
 *
 * Nada do outro lado é confiado: o que não for nome em texto é descartado.
 */
@Injectable()
export class HrDepartmentsRepository {
  constructor(@Inject(ENV) private readonly env: Env) {}

  async listNames(): Promise<string[]> {
    if (!this.env.ADMIN_CONSOLE_URL) throw new Error('ADMIN_CONSOLE_URL is not set');

    const url = `${this.env.ADMIN_CONSOLE_URL.replace(/\/$/, '')}/api/systems/me/organization-options`;
    const response = await fetch(url, {
      headers: this.headers(),
      signal: AbortSignal.timeout(this.env.ADMIN_CONSOLE_TIMEOUT_MS),
    });
    /* 401/403 é quase sempre o token: sem `ADMIN_CONSOLE_TOKEN`, ou um de outro sistema. */
    if (!response.ok) throw new Error(`Admin-console answered ${response.status}`);

    const options = ((await response.json()) as OrganizationOptionsResponse).data
      ?.organizationOptions;
    /* O RH fora do ar chega como 200 com `isAvailable: false` e lista vazia — é falha, não vazio. */
    if (options?.isAvailable !== true || !Array.isArray(options.departments)) {
      throw new Error('HR departments are unavailable');
    }

    return namesOf(options.departments);
  }

  private headers(): Record<string, string> {
    if (!this.env.ADMIN_CONSOLE_TOKEN) return { accept: 'application/json' };

    return { accept: 'application/json', authorization: `Bearer ${this.env.ADMIN_CONSOLE_TOKEN}` };
  }
}

/** Os nomes, sem repetição nem item quebrado, na ordem do português. */
function namesOf(departments: unknown[]): string[] {
  const names = departments
    .map((department) =>
      typeof department === 'object' && department !== null && 'name' in department
        ? department.name
        : null,
    )
    .filter((name): name is string => typeof name === 'string')
    .map((name) => name.trim())
    .filter((name) => name !== '');

  return [...new Set(names)].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}
