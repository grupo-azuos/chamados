/**
 * O DIRETÓRIO DE PESSOAS da tela — de onde o rosto (`AzuosPersonAvatar`) tira a FOTO.
 *
 * Regra do grupo: onde aparece uma pessoa, aparece a foto dela. Muitos registros guardam só o
 * nome ("Wellington Queiroz" na manutenção) ou o id sem a foto; sem um lugar para procurar, o
 * rosto caía nas iniciais mesmo com a pessoa tendo foto. Aqui fica a lista de quem usa o sistema
 * (com a foto), carregada UMA vez com a casca (`usePeopleDirectoryLoader`), e o rosto procura por
 * id ou, sem id, pelo nome — sem acento, sem diferença de maiúscula.
 *
 * É um estado do módulo, e não um contexto: o app é SPA (sem renderização no servidor), então não
 * há pedido de outra pessoa dividindo a mesma memória.
 */
export type DirectoryPerson = { id: string; name: string; avatarUrl?: string | null };

/* Objetos simples, trocados inteiros a cada carga: a reatividade vem da troca, não de mutação. */
const state = $state<{ byId: Record<string, string>; byName: Record<string, string> }>({
  byId: {},
  byName: {},
});

/** O nome comparável: sem acento, sem diferença de maiúscula e com um espaço só. */
export function normalizePersonName(name: string): string {
  return name.normalize('NFD').replace(/\p{M}/gu, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

export function setPeopleDirectory(people: readonly DirectoryPerson[]): void {
  const byId: Record<string, string> = {};
  const byName: Record<string, string> = {};
  for (const person of people) {
    if (!person.avatarUrl) continue;
    byId[person.id] = person.avatarUrl;
    byName[normalizePersonName(person.name)] = person.avatarUrl;
  }
  state.byId = byId;
  state.byName = byName;
}

/** A foto da pessoa: pelo id, ou pelo nome quando o registro só guardou o nome. */
export function personPhotoOf(person: { id?: string | null; name?: string | null }): string | null {
  if (person.id) {
    const byId = state.byId[person.id];
    if (byId) return byId;
  }
  if (person.name) return state.byName[normalizePersonName(person.name)] ?? null;

  return null;
}
