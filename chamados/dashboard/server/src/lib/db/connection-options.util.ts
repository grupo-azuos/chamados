import { type ClientConfig } from 'pg';

/** CA do ambiente vem do Infisical; não desabilitar a verificação de certificado. */
export function connectionOptions(url: string, ca?: string): ClientConfig {
  if (!ca) return { connectionString: url };
  const target = new URL(url);
  // pg-connection-string não pode sobrescrever o objeto ssl com parâmetros da URL.
  for (const field of ['sslmode', 'sslrootcert', 'sslcert', 'sslkey'])
    target.searchParams.delete(field);
  return {
    connectionString: target.toString(),
    ssl: { ca: ca.replace(/\\n/g, '\n'), rejectUnauthorized: true },
  };
}
