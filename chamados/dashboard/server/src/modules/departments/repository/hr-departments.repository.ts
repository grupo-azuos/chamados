import { serviceAuthorization } from '../../../lib/auth/oauth-token.client';
import { Inject, Injectable } from '@nestjs/common';
import { type DepartmentOption } from '@template/shared/domain/department.util';

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
 * interna. Ele repassa a lista em `GET /api/v1/systems/me/organization-options`, com o mesmo token
 * de serviço que este sistema já usa para o diretório de pessoas (`ADMIN_CONSOLE_CLIENT_SECRET`) —
 * nenhuma configuração nova, e o schema do RH continua sendo só do RH.
 *
 * Falha LANÇA em vez de devolver lista vazia: quem decide o que fazer é o `DepartmentsService`,
 * que segue com a última lista lida. Vazio aqui diria "o RH não tem departamento nenhum".
 *
 * Nada do outro lado é confiado: o que não for nome em texto, com id inteiro, é descartado. O
 * `id` é o do item na lista "Departamentos" do RH — estável quando o nome muda, e é o que o
 * computador guarda.
 */
@Injectable()
export class HrDepartmentsRepository {
  constructor(@Inject(ENV) private readonly env: Env) {}

  async listOptions(): Promise<DepartmentOption[]> {
    if (!this.env.ADMIN_CONSOLE_URL) throw new Error('ADMIN_CONSOLE_URL is not set');

    const url = `${this.env.ADMIN_CONSOLE_URL.replace(/\/$/, '')}/api/v1/systems/me/organization-options`;
    const response = await fetch(url, {
      headers: await this.headers(),
      signal: AbortSignal.timeout(this.env.ADMIN_CONSOLE_TIMEOUT_MS),
    });
    /* 401/403 é quase sempre o token: sem `ADMIN_CONSOLE_CLIENT_SECRET`, ou um de outro sistema. */
    if (!response.ok) throw new Error(`Admin-console answered ${response.status}`);

    const options = ((await response.json()) as OrganizationOptionsResponse).data
      ?.organizationOptions;
    /* O RH fora do ar chega como 200 com `isAvailable: false` e lista vazia — é falha, não vazio. */
    if (options?.isAvailable !== true || !Array.isArray(options.departments)) {
      throw new Error('HR departments are unavailable');
    }

    return optionsOf(options.departments);
  }

  private async headers(): Promise<Record<string, string>> {
    if (!this.env.ADMIN_CONSOLE_CLIENT_SECRET) return { accept: 'application/json' };

    return { accept: 'application/json', authorization: await serviceAuthorization(this.env) };
  }
}

/** Os departamentos, sem nome repetido nem item quebrado, na ordem do português. */
function optionsOf(departments: unknown[]): DepartmentOption[] {
  const byName = new Map<string, DepartmentOption>();
  for (const department of departments) {
    const option = optionOf(department);
    if (option && !byName.has(option.name)) byName.set(option.name, option);
  }

  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

function optionOf(department: unknown): DepartmentOption | null {
  if (typeof department !== 'object' || department === null) return null;
  const { id, name } = department as { id?: unknown; name?: unknown };
  if (typeof name !== 'string' || name.trim() === '') return null;
  if (typeof id !== 'number' || !Number.isInteger(id)) return null;

  return { id, name: name.trim() };
}
