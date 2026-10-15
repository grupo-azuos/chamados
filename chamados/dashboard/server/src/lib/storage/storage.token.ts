/**
 * Token de injeção do cliente S3.
 *
 * Fica num arquivo só dele pelo mesmo motivo do `db.token.ts`: o módulo constrói o cliente
 * quando é avaliado, e um service que apenas importasse o token acabaria construindo uma
 * conexão com o storage para rodar um teste que nem toca em arquivo.
 */
export const OBJECT_STORAGE = 'TEMPLATE_OBJECT_STORAGE';
