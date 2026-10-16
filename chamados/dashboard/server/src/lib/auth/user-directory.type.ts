import { type DirectoryUser } from '@template/shared/schemas/user.schema';

/**
 * Contrato para fornecimento de usuários do diretório de identidade.
 *
 * As contas vivem no admin-console (`AdminConsoleUserDirectoryProvider`). Esta interface
 * garante que nenhum serviço de negócio (ex.: o de Acessos, o de responsáveis) conheça o
 * outro serviço diretamente: trocar de provedor é trocar a injeção em `AuthModule`.
 */
export interface UserDirectoryProvider {
  /** As pessoas que têm acesso a este sistema. Falha de leitura é exceção, nunca lista vazia. */
  listUsers(): Promise<DirectoryUser[]>;

  /** Busca uma pessoa específica pelo seu identificador único. */
  getUserById(id: string): Promise<DirectoryUser | null>;

  /**
   * As pessoas do ESCRITÓRIO (não só as deste sistema) cujo nome ou e-mail contém o termo.
   * É o que o bot do WhatsApp usa para reconhecer quem escreve. Falha é exceção.
   */
  searchUsers(term: string): Promise<DirectoryUser[]>;
}
