import { z } from 'zod';

type OAuthEnvironment = {
  ADMIN_CONSOLE_URL?: string;
  ADMIN_CONSOLE_CLIENT_SECRET?: string;
  ADMIN_CONSOLE_TIMEOUT_MS?: number;
};

const tokenSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.string().regex(/^Bearer$/i),
  expires_in: z.number().int().min(1).max(300),
});

/** Uma credencial de máquina só é apresentada ao emissor; as APIs recebem JWT curto. */
export class OAuthTokenClient {
  private cached: { value: string; until: number } | undefined;
  private pending: Promise<string> | undefined;

  constructor(
    private readonly env: OAuthEnvironment,
    private readonly audience: string,
  ) {}

  async authorization(): Promise<string> {
    if (this.cached && Date.now() < this.cached.until) return `Bearer ${this.cached.value}`;

    this.pending ??= this.issue().finally(() => {
      this.pending = undefined;
    });
    return `Bearer ${await this.pending}`;
  }

  private async issue(): Promise<string> {
    const base = this.env.ADMIN_CONSOLE_URL;
    const secret = this.env.ADMIN_CONSOLE_CLIENT_SECRET;
    if (!base || !secret)
      throw new Error('Configure ADMIN_CONSOLE_URL and ADMIN_CONSOLE_CLIENT_SECRET');

    const startedAt = Date.now();
    const response = await fetch(new URL('/api/oauth2/token', base), {
      method: 'POST',
      redirect: 'error',
      headers: {
        authorization: `Basic ${Buffer.from(`:${secret}`).toString('base64')}`,
        'content-type': 'application/x-www-form-urlencoded',
        accept: 'application/json',
      },
      body: new URLSearchParams({ grant_type: 'client_credentials', audience: this.audience }),
      signal: AbortSignal.timeout(this.env.ADMIN_CONSOLE_TIMEOUT_MS ?? 4000),
    });
    // Nunca incluir corpo, headers ou credencial em erros/logs.
    if (!response.ok) throw new Error(`OAuth token endpoint answered ${response.status}`);

    const token = tokenSchema.parse(await response.json());
    this.cached = {
      value: token.access_token,
      until: startedAt + Math.max(0, token.expires_in - 30) * 1000,
    };
    return token.access_token;
  }
}

const clients = new WeakMap<OAuthEnvironment, Map<string, OAuthTokenClient>>();

/** Cache por instância de configuração e audience; nenhuma credencial vai para o Valkey. */
export function serviceAuthorization(
  env: OAuthEnvironment,
  audience = 'admin-console',
): Promise<string> {
  let byAudience = clients.get(env);
  if (!byAudience) {
    byAudience = new Map();
    clients.set(env, byAudience);
  }
  let client = byAudience.get(audience);
  if (!client) {
    client = new OAuthTokenClient(env, audience);
    byAudience.set(audience, client);
  }
  return client.authorization();
}
