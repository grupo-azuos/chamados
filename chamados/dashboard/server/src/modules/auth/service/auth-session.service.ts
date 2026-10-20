import {
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { type Env } from '../../../lib/config/env.schema';
import { ENV } from '../../../lib/config/env.token';

const UNAVAILABLE = 'Não consegui encerrar a sessão no admin-console. Tente novamente.';

/** O admin-console revoga a sessão; esta API apenas encaminha a ação e seus cookies de saída. */
@Injectable()
export class AuthSessionService {
  constructor(@Inject(ENV) private readonly env: Env) {}

  async logout(cookieHeader: string | undefined, contentType: string | undefined): Promise<string[]> {
    /* JSON exige preflight: um formulário de outro site não pode deslogar a pessoa. */
    if (contentType?.split(';')[0]?.trim().toLowerCase() !== 'application/json') {
      throw new UnsupportedMediaTypeException('Esta ação só aceita JSON.');
    }
    if (!this.env.ADMIN_CONSOLE_URL) throw new ServiceUnavailableException(UNAVAILABLE);

    const names = sessionCookieNames(this.env.ADMIN_CONSOLE_COOKIE_PREFIX);
    const cookies = sessionCookiesOf(cookieHeader, names);
    if (!cookies) throw new UnauthorizedException('A sessão não foi encontrada no navegador.');

    try {
      const response = await fetch(new URL('/api/auth/logout', this.env.ADMIN_CONSOLE_URL), {
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json', cookie: cookies },
        body: '{}',
        redirect: 'error',
        signal: AbortSignal.timeout(this.env.ADMIN_CONSOLE_TIMEOUT_MS),
      });
      if (!response.ok) throw new Error('Logout rejected');

      const cleared = response.headers.getSetCookie().filter((cookie) =>
        names.some((name) => cookie.startsWith(`${name}=`)),
      );
      if (!names.every((name) => cleared.some((cookie) => cookie.startsWith(`${name}=`)))) {
        throw new Error('Session clearing cookies missing');
      }
      return cleared;
    } catch {
      throw new ServiceUnavailableException(UNAVAILABLE);
    }
  }
}

function sessionCookieNames(prefix: string): string[] {
  return [`${prefix}_access_token`, `${prefix}_refresh_token`];
}

function sessionCookiesOf(header: string | undefined, names: string[]): string {
  return (header ?? '')
    .split(';')
    .map((part) => part.trim())
    .filter((part) => {
      const separator = part.indexOf('=');
      return separator > 0 && names.includes(part.slice(0, separator)) && part.length > separator + 1;
    })
    .join('; ');
}
