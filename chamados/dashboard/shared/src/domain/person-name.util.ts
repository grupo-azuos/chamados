/**
 * O NOME DE UMA PESSOA COMO CHAVE — sem acento, sem caixa e sem espaço sobrando. É assim que o
 * nome gravado num alvará ("leyla souza ") encontra a pessoa do cadastro de acesso ("Leyla
 * Souza"): a mesma regra para a notificação e para o responsável por id.
 */
export function personNameKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/**
 * O id de cada nome, pelo cadastro de acesso. Nome repetido (duas pessoas com o mesmo nome) NÃO
 * entra: adivinhar qual das duas é o responsável seria pior que deixar sem id.
 */
export function personIdsByName(
  people: readonly { id: string; name: string }[],
): Map<string, string> {
  const ids = new Map<string, string>();
  const repeated = new Set<string>();
  for (const person of people) {
    const key = personNameKey(person.name);
    if (ids.has(key)) repeated.add(key);
    ids.set(key, person.id);
  }
  for (const key of repeated) ids.delete(key);

  return ids;
}
