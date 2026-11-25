/**
 * A CHAVE do nome de um produto: sem espaço sobrando e sem diferença de maiúscula. "CADEIRA",
 * "cadeira" e " Cadeira " são o mesmo produto — é por ela que o Depósito agrupa e que o cadastro
 * reaproveita a grafia que já existe.
 */
export function inventoryNameKey(name: string): string {
  return name.trim().toLocaleLowerCase('pt-BR');
}

/**
 * Os nomes de produto, um por chave, na grafia MAIS USADA (empate: a que apareceu primeiro), em
 * ordem alfabética — a lista do campo "Nome do produto".
 */
export function distinctInventoryNames(names: readonly string[]): string[] {
  const counts = new Map<string, Map<string, number>>();
  for (const raw of names) {
    const spelling = raw.trim();
    const key = inventoryNameKey(spelling);
    if (!key) continue;
    const spellings = counts.get(key) ?? new Map<string, number>();
    spellings.set(spelling, (spellings.get(spelling) ?? 0) + 1);
    counts.set(key, spellings);
  }

  return [...counts.values()]
    .map((spellings) => mostUsed(spellings))
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

function mostUsed(spellings: Map<string, number>): string {
  let best = '';
  let bestCount = 0;
  for (const [spelling, total] of spellings) {
    if (total <= bestCount) continue;
    best = spelling;
    bestCount = total;
  }

  return best;
}
