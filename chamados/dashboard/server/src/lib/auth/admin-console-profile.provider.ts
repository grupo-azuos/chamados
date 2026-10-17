import { Inject, Injectable, Logger } from '@nestjs/common';

import { type Env } from '../config/env.schema';
import { ENV } from '../config/env.token';

/** O perfil de quem está logado, como o admin-console devolve — só o que o chamados usa. */
export type AdminConsoleProfile = {
  name: string;
  email: string;
  phone: string | null;
  department: string | null;
  jobTitle: string | null;
};

type ProfileResponse = {
  data?: {
    user?: {
      name?: unknown;
      email?: unknown;
      profile?: { phone?: unknown; department?: unknown; jobTitle?: unknown } | null;
    };
  };
};

/**
 * O PERFIL DE QUEM ESTÁ LOGADO, lido no admin-console (`GET /api/me/profile`).
 *
 * Essa rota só aceita a SESSÃO da própria pessoa — não há token de serviço que a leia, e é de
 * propósito: telefone e data de nascimento não saem na lista de pessoas. Por isso quem chama é
 * este servidor, repassando o cookie de acesso que veio do navegador dela (o navegador não pode
 * chamar direto: o admin-console só libera para outros sistemas a leitura do diretório).
 *
 * Duas travas:
 *
 *  - **Só o cookie de ACESSO vai.** O de renovação, reapresentado por outro processo, é para o
 *    admin-console um token roubado, e ele derruba a sessão inteira.
 *  - **Falha não derruba ninguém.** Sem cookie, cookie vencido ou admin-console fora do ar, a
 *    resposta é `null` e o formulário só não vem preenchido.
 */
@Injectable()
export class AdminConsoleProfileProvider {
  private readonly logger = new Logger(AdminConsoleProfileProvider.name);

  constructor(@Inject(ENV) private readonly env: Env) {}

  async fetchMine(cookieHeader: string | undefined): Promise<AdminConsoleProfile | null> {
    const accessCookie = this.accessCookieOf(cookieHeader);
    if (!accessCookie || !this.env.ADMIN_CONSOLE_URL) return null;

    try {
      const response = await fetch(
        `${this.env.ADMIN_CONSOLE_URL.replace(/\/$/, '')}/api/me/profile`,
        {
          headers: { accept: 'application/json', cookie: accessCookie },
          signal: AbortSignal.timeout(this.env.ADMIN_CONSOLE_TIMEOUT_MS),
        },
      );
      if (!response.ok) {
        this.logger.warn(`Admin-console profile answered ${response.status}`);

        return null;
      }

      return toProfile((await response.json()) as ProfileResponse);
    } catch (error) {
      this.logger.warn(
        `Admin-console profile is unreachable: ${error instanceof Error ? error.message : String(error)}`,
      );

      return null;
    }
  }

  /** `<prefixo>_access_token=<valor>`, e nada mais do cabeçalho original. */
  private accessCookieOf(cookieHeader: string | undefined): string | null {
    const name = `${this.env.ADMIN_CONSOLE_COOKIE_PREFIX}_access_token`;
    const pair = (cookieHeader ?? '')
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${name}=`));
    if (!pair || pair.length <= name.length + 1) return null;

    return pair;
  }
}

function toProfile(body: ProfileResponse): AdminConsoleProfile | null {
  const user = body.data?.user;
  if (!user) return null;

  const name = textOf(user.name);
  const email = textOf(user.email);
  if (!name || !email) return null;

  return { name, email, ...profileFieldsOf(user.profile) };
}

type RawProfile = NonNullable<NonNullable<NonNullable<ProfileResponse['data']>['user']>['profile']>;

function profileFieldsOf(raw: RawProfile | null | undefined) {
  const profile = raw ?? {};

  return {
    phone: textOf(profile.phone),
    department: textOf(profile.department),
    jobTitle: textOf(profile.jobTitle),
  };
}

function textOf(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();

  return trimmed === '' ? null : trimmed;
}
