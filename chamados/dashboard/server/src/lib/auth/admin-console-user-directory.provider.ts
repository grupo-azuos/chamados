import { Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { type DirectoryUser } from '@template/shared/schemas/user.schema';

import { type Env } from '../config/env.schema';
import { ENV } from '../config/env.token';
import { type UserDirectoryProvider } from './user-directory.type';

/**
 * AS PESSOAS DESTE SISTEMA, lidas no admin-console.
 *
 * Duas rotas de lá, com o token de serviço do sistema (`ADMIN_CONSOLE_TOKEN`):
 *
 *  - `GET /api/systems/me/access` — QUEM PODE ENTRAR AQUI, com o papel de cada um. É a lista
 *    do seletor de responsável e da tela de Acessos: oferecer o escritório inteiro seria
 *    oferecer quem nem consegue abrir o sistema. O `me` é o sistema dono do token; não existe
 *    parâmetro para pedir a lista de outro.
 *  - `GET /api/users?ids=` — uma pessoa só, pelo UUID.
 *  - `GET /api/users?search=` — quem tem o termo no nome ou no e-mail, no escritório inteiro:
 *    quem pede acesso pelo WhatsApp ainda não está na lista deste sistema.
 *
 * Três decisões:
 *
 *  - **Falha aparece.** Lista de pessoas que não pôde ser lida vira 503 com o motivo, e não
 *    lista vazia: vazio diria "ninguém tem acesso", e o super-admin sairia liberando módulo
 *    para quem já tinha (CONTRIBUTING §15 — lista nunca é truncada calada).
 *  - **Memória de um minuto.** A tela de Acessos e o seletor de responsável leem a lista a cada
 *    abertura; sem cache, cada clique seria uma ida a outro serviço. Falha não é guardada.
 *  - **Nada do outro lado é confiado.** O que não for texto vira nulo, e pessoa sem id, nome ou
 *    e-mail é descartada.
 */
const CACHE_TTL_MS = 60_000;

/* Busca por um primeiro nome comum ("Ana") traz bastante gente; o desempate é local. */
const SEARCH_PAGE_SIZE = 50;

const UNAVAILABLE = 'Não consegui ler as pessoas no admin-console. Tente de novo em instantes.';

type AccessListResponse = {
  data?: {
    people?: {
      id?: unknown;
      name?: unknown;
      email?: unknown;
      role?: unknown;
      presentation?: { avatarUrl?: unknown } | null;
    }[];
  };
};

type UsersResponse = {
  data?: {
    users?: {
      id?: unknown;
      name?: unknown;
      email?: unknown;
      profile?: { avatarUrl?: unknown } | null;
    }[];
  };
};

@Injectable()
export class AdminConsoleUserDirectoryProvider implements UserDirectoryProvider {
  private readonly logger = new Logger(AdminConsoleUserDirectoryProvider.name);
  private cached: { users: DirectoryUser[]; at: number } | null = null;

  constructor(@Inject(ENV) private readonly env: Env) {}

  async listUsers(): Promise<DirectoryUser[]> {
    if (this.cached && Date.now() - this.cached.at < CACHE_TTL_MS) return this.cached.users;

    const body = await this.read<AccessListResponse>('/api/systems/me/access');
    const users = toDirectoryUsers(body.data?.people, (person) => person.presentation?.avatarUrl);
    this.cached = { users, at: Date.now() };

    return users;
  }

  async getUserById(id: string): Promise<DirectoryUser | null> {
    const fromList = this.cached?.users.find((user) => user.id === id);
    if (fromList) return fromList;

    const body = await this.read<UsersResponse>(
      `/api/users?ids=${encodeURIComponent(id)}&pageSize=1`,
    );

    return toDirectoryUsers(body.data?.users, (user) => user.profile?.avatarUrl)[0] ?? null;
  }

  async searchUsers(term: string): Promise<DirectoryUser[]> {
    const body = await this.read<UsersResponse>(
      `/api/users?search=${encodeURIComponent(term)}&pageSize=${SEARCH_PAGE_SIZE}`,
    );

    return toDirectoryUsers(body.data?.users, (user) => user.profile?.avatarUrl);
  }

  private async read<T>(path: string): Promise<T> {
    if (!this.env.ADMIN_CONSOLE_URL) {
      this.logger.warn('ADMIN_CONSOLE_URL is not set — the people list is off');
      throw new ServiceUnavailableException(UNAVAILABLE);
    }

    const url = `${this.env.ADMIN_CONSOLE_URL.replace(/\/$/, '')}${path}`;

    try {
      const response = await fetch(url, {
        headers: this.headers(),
        signal: AbortSignal.timeout(this.env.ADMIN_CONSOLE_TIMEOUT_MS),
      });
      if (response.ok) return (await response.json()) as T;

      /* 401/403 aqui é quase sempre o token: sem `ADMIN_CONSOLE_TOKEN`, ou um gerado para
         outro sistema. O log diz o código; o token é gerado na tela do sistema, lá. */
      this.logger.warn(`Admin-console answered ${response.status} for ${path}`);
    } catch (error) {
      this.logger.warn(`Admin-console is unreachable for ${path}: ${reasonOf(error)}`);
    }

    throw new ServiceUnavailableException(UNAVAILABLE);
  }

  private headers(): Record<string, string> {
    if (!this.env.ADMIN_CONSOLE_TOKEN) return { accept: 'application/json' };

    return { accept: 'application/json', authorization: `Bearer ${this.env.ADMIN_CONSOLE_TOKEN}` };
  }
}

type RawPerson = { id?: unknown; name?: unknown; email?: unknown; role?: unknown };

function toDirectoryUsers<T extends RawPerson>(
  people: T[] | undefined,
  avatarOf: (person: T) => unknown,
): DirectoryUser[] {
  if (!Array.isArray(people)) return [];

  return people
    .map((person) => ({
      id: textOf(person.id),
      name: textOf(person.name),
      email: textOf(person.email),
      image: nullableTextOf(avatarOf(person)),
      role: nullableTextOf(person.role),
      banned: false,
      createdAt: null,
    }))
    .filter((user) => user.id !== '' && user.name !== '' && user.email.includes('@'))
    .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'));
}

function textOf(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function nullableTextOf(value: unknown): string | null {
  const text = textOf(value);

  return text === '' ? null : text;
}

function reasonOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
