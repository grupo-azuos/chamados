/**
 * A FICHA DE QUEM ESTÁ NA SESSÃO, lida direto do admin-console — a fonte única da conta.
 *
 * O navegador chama com a sessão que a pessoa já tem (`credentials: 'include'`); o admin-console
 * aceita LEITURA destas duas rotas vindas de qualquer sistema do grupo, e só leitura. Editar
 * continua sendo no próprio admin-console. É o mesmo contrato dos sistemas em React.
 */
export type AccountRole = 'admin' | 'manager' | 'user';

export type AccountProfile = {
  name: string;
  email: string;
  role: AccountRole;
  profile: {
    avatarUrl: string | null;
    jobTitle: string | null;
    department: string | null;
    phone: string | null;
    birthDate: string | null;
    bio: string | null;
  };
};

export type AccountSystem = {
  name: string;
  presentation: { url: string };
  access: { role: AccountRole };
};

/**
 * ONDE FICA A CONTA (Admin Console). O endereço configurado no servidor (`ADMIN_CONSOLE_LOGIN_URL`)
 * vale primeiro; sem ele, sai do domínio em que a tela está — a mesma regra dos outros 12
 * sistemas. Sem isso, num ambiente sem a variável (o homo) a ficha do "Meu perfil" vinha vazia.
 */
export function accountOrigin(
  configured: string | null | undefined,
  hostname = window.location.hostname,
): string {
  if (configured) return new URL(configured).origin;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return 'http://localhost:5000';
  if (hostname.endsWith('.homo.grupoazuos.com.br'))
    return 'https://admin-console.homo.grupoazuos.com.br';
  if (hostname === 'grupoazuos.com.br' || hostname.endsWith('.grupoazuos.com.br'))
    return 'https://admin-console.grupoazuos.com.br';

  throw new Error('Sem endereço da conta.');
}

/**
 * O link do botão "Editar no Admin Console": a tela de perfil da conta, no mesmo endereço de
 * onde a ficha é lida — igual aos outros sistemas do grupo. Sem a variável no servidor o botão
 * sumia, embora a ficha viesse (ela já caía no domínio). Fora de um domínio conhecido, sem botão.
 */
export function accountProfileUrl(
  configured: string | null | undefined,
  hostname = window.location.hostname,
): string | null {
  try {
    return new URL('/profile', accountOrigin(configured, hostname)).href;
  } catch {
    return null;
  }
}

async function readAccount<T>(accountUrl: string, path: string): Promise<T> {
  const response = await fetch(new URL(path, new URL(accountUrl).origin), {
    credentials: 'include',
    headers: { accept: 'application/json' },
    redirect: 'error',
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error('Não consegui ler sua conta no admin-console.');

  return (await response.json()) as T;
}

export const accountProfileApi = {
  me: async (accountUrl: string): Promise<AccountProfile> =>
    (await readAccount<{ data: { user: AccountProfile } }>(accountUrl, '/api/me/profile')).data.user,
  systems: async (accountUrl: string): Promise<AccountSystem[]> =>
    (await readAccount<{ data: { systems: AccountSystem[] } }>(accountUrl, '/api/me/systems')).data
      .systems,
};
