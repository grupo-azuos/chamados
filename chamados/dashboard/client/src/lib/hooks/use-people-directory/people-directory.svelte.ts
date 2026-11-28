/**
 * O DIRETÓRIO DE PESSOAS da tela — de onde o rosto (`AzuosPersonAvatar`) tira a FOTO.
 *
 * Regra do grupo: onde aparece uma pessoa, aparece a foto dela. Muitos registros guardam só o
 * nome ("Wellington Queiroz" na manutenção) ou o id sem a foto; sem um lugar para procurar, o
 * rosto caía nas iniciais mesmo com a pessoa tendo foto. Aqui fica a lista de quem usa o sistema
 * (com a foto), carregada UMA vez com a casca (`usePeopleDirectoryLoader`), e o rosto procura por
 * id, pelo e-mail (o registro que guardou quem fez pelo login) ou pelo nome — sem acento, sem
 * diferença de maiúscula.
 *
 * É um estado do módulo, e não um contexto: o app é SPA (sem renderização no servidor), então não
 * há pedido de outra pessoa dividindo a mesma memória.
 */
export type DirectoryPerson = {
  id: string;
  name: string;
  email?: string | null;
  avatarUrl?: string | null;
};

/* Objetos simples, trocados inteiros a cada carga: a reatividade vem da troca, não de mutação. */
const state = $state<{
  byId: Record<string, string>;
  byEmail: Record<string, string>;
  byName: Record<string, string>;
  nameById: Record<string, string>;
}>({
  byId: {},
  byEmail: {},
  byName: {},
  nameById: {},
});

/** O nome comparável: sem acento, sem diferença de maiúscula e com um espaço só. */
export function normalizePersonName(name: string): string {
  return name.normalize('NFD').replace(/\p{M}/gu, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

/** O e-mail comparável: sem espaço em volta e em minúsculas — `Ana@Casa.com` é a mesma pessoa. */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function setPeopleDirectory(people: readonly DirectoryPerson[]): void {
  const byId: Record<string, string> = {};
  const byEmail: Record<string, string> = {};
  const byName: Record<string, string> = {};
  const nameById: Record<string, string> = {};
  for (const person of people) {
    nameById[person.id] = person.name;
    if (!person.avatarUrl) continue;
    byId[person.id] = person.avatarUrl;
    byName[normalizePersonName(person.name)] = person.avatarUrl;
    if (person.email) byEmail[normalizeEmail(person.email)] = person.avatarUrl;
  }
  state.byId = byId;
  state.byEmail = byEmail;
  state.byName = byName;
  state.nameById = nameById;
}

/** O nome de hoje da pessoa, pelo id — para o registro que guardou o id e não o nome. */
export function personNameOf(id: string | null | undefined): string | null {
  return id ? (state.nameById[id] ?? null) : null;
}

/**
 * A foto da pessoa: pelo id; sem ele, pelo e-mail; sem os dois, pelo nome. O "nome" que é um
 * e-mail (o registro guardou o login no lugar do nome) é procurado como e-mail.
 */
export function personPhotoOf(person: {
  id?: string | null;
  name?: string | null;
  email?: string | null;
}): string | null {
  const byId = person.id ? state.byId[person.id] : undefined;
  if (byId) return byId;
  const email = person.email ?? (person.name?.includes('@') ? person.name : null);
  const byEmail = email ? state.byEmail[normalizeEmail(email)] : undefined;
  if (byEmail) return byEmail;
  if (!person.name) return null;

  return state.byName[normalizePersonName(person.name)] ?? null;
}
