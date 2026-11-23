/**
 * O NOME DO SISTEMA DIGITADO À MÃO — quando a pessoa não achou o sistema na lista.
 *
 * Sistema só tem um nome: "Trilha", "trilha" e " TRILHA " são o mesmo. Por isso o nome é
 * gravado SEMPRE do mesmo jeito — sem espaço nas pontas, com um espaço só entre as palavras e
 * em minúsculas. Sem isto, o painel e o filtro de Sistema mostravam o mesmo sistema duas vezes.
 *
 * A mesma regra existe em SQL na migration `0023_lowercase_custom_system_names` (para o que já
 * estava gravado) e na leitura do painel (`widget-sources.ts`). Mudou aqui, muda lá.
 */
export function normalizeSystemName(value: unknown): string | null {
  /* O que não é texto (nulo, ausente, ou o `unknown` de um campo com `preprocess`) é "sem
     sistema". */
  if (typeof value !== 'string') return null;

  /* Vazio depois de limpar também é "sem sistema", como sempre foi: "" e nulo significando a
     mesma coisa confunde a busca. */
  return value.trim().replace(/\s+/g, ' ').toLowerCase() || null;
}
