/**
 * COMO SE MOSTRA QUEM FEZ ALGUMA COISA — e por que endereço de e-mail nunca aparece.
 *
 * Os registros migrados guardam o AUTOR como o sistema anterior o gravou: às vezes um e-mail
 * (`leylabraz1994@outlook.com`), às vezes o primeiro nome (`Camila`), às vezes o
 * identificador de uma rotina (`consolidacao-duplicados`). Publicar esse texto cru numa tela
 * de ranking mostra a pessoa pelo que ela não é, e expõe o endereço particular dela — várias
 * são contas pessoais de gmail e outlook — para a equipe inteira.
 *
 * DUAS REGRAS, e a segunda é a que já foi violada:
 *
 * 1. O nome vem de uma LISTA. Do cadastro de acesso primeiro, do de-para do sistema anterior
 *    depois. Nunca de cálculo em cima do endereço.
 *
 * 2. Endereço que não está em lista nenhuma NÃO vai para a tela. Ele vira um rótulo que diz
 *    a verdade — "Sem cadastro" —, que é uma informação honesta: aquele endereço trabalhou
 *    aqui e não está em lista nenhuma hoje.
 *
 * O que já esteve no lugar disto, copiado do `_gamUser` do sistema anterior, derivava o nome
 * do prefixo do endereço. Ele INVENTOU gente: `advgabryelisaac@gmail.com` virou
 * "Advgabryelisaac" e `leylabraz1994@outlook.com` virou "Leylabraz1994" — que é a Leyla. A
 * tela de premiação ficou povoada de pessoas que não existem, num relatório que paga. Lá
 * aquele recurso quase nunca dispara, porque a lista de usuários resolve quase todo mundo;
 * aqui a lista estava vazia, então ele disparava para todos.
 *
 * Texto que NÃO é endereço continua cru quando não resolve: `consolidacao-duplicados` na tela
 * é o que está gravado, e não expõe ninguém.
 */

/** O que aparece no lugar de um endereço que nenhuma lista conhece. */
export const UNKNOWN_ACTOR_LABEL = 'Sem cadastro';

/** Basta ter arroba com algo dos dois lados: aqui o objetivo é não deixar passar. */
function looksLikeEmail(value: string): boolean {
  return /^[^@\s]+@[^@\s]+$/.test(value);
}

export type ActorNameLookup = (key: string) => string | null | undefined;

/**
 * O nome a mostrar para um autor gravado.
 *
 * `lookups` são consultadas na ordem — a primeira que responder vence. Passe o cadastro de
 * acesso antes do de-para do sistema anterior: quem está no cadastro é a pessoa de hoje, com
 * o nome que ela mesma mantém.
 */
export function actorDisplayName(
  actor: string | null | undefined,
  ...lookups: ActorNameLookup[]
): string {
  const raw = String(actor ?? '').trim();
  if (!raw) return UNKNOWN_ACTOR_LABEL;

  const key = raw.toLowerCase();
  for (const lookup of lookups) {
    const found = lookup(key)?.trim();
    if (found) return found;
  }

  return looksLikeEmail(raw) || /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(raw)
    ? UNKNOWN_ACTOR_LABEL
    : raw;
}
