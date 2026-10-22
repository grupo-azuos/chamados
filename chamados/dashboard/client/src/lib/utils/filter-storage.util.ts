/**
 * O ARMAZÉM DOS FILTROS — um objeto por pessoa, com uma entrada por tela.
 *
 * Diferente do `preference-store` (tema, efeitos: UMA escolha para o sistema inteiro), o filtro
 * é de uma TELA e de uma PESSOA. A chave leva o `user.id` (UUID) e nunca nome ou e-mail: o nome
 * é texto livre e o e-mail muda; o UUID é o que identifica a conta. Em máquina compartilhada, a
 * próxima pessoa abre outra chave e não herda o recorte da anterior.
 *
 * Tudo aqui é defensivo: `localStorage` lança em janela privada e com cookies bloqueados, e o
 * conteúdo pode estar corrompido ou ser de uma versão antiga. Em qualquer um desses casos o
 * filtro salvo é tratado como AUSENTE — a tela abre com o padrão, nunca quebrada.
 *
 * O `localStorage` é síncrono, e isso é deliberado: a tela lê o filtro salvo ANTES da primeira
 * consulta. Com uma leitura assíncrona, a primeira chamada sairia com o padrão e a segunda com
 * o filtro salvo — duas respostas, e a primeira piscando na tela.
 */

/** Sobe quando o formato do objeto salvo mudar; versão diferente é descartada, não migrada. */
export const FILTER_STORAGE_VERSION = 1;

type StoredFilters = {
  version: number;
  screens: Record<string, unknown>;
};

export function filterStorageKey(userId: string): string {
  return `azuos:filters:v${FILTER_STORAGE_VERSION}:${userId}`;
}

/** O que está salvo para a tela, sem validar; `undefined` quando não há nada que sirva. */
export function loadScreenFilters(userId: string | undefined, screen: string): unknown {
  if (!userId) return undefined;
  const stored = readStored(userId);

  return stored?.screens[screen];
}

export function saveScreenFilters(userId: string | undefined, screen: string, value: unknown): void {
  if (!userId) return;
  const stored = readStored(userId) ?? emptyStored();

  writeStored(userId, { ...stored, screens: { ...stored.screens, [screen]: value } });
}

/** "Limpar filtros": some só com a entrada desta tela; as outras telas seguem como estavam. */
export function clearScreenFilters(userId: string | undefined, screen: string): void {
  if (!userId) return;
  const stored = readStored(userId);

  if (!stored || !(screen in stored.screens)) return;

  const { [screen]: _removed, ...rest } = stored.screens;

  writeStored(userId, { ...stored, screens: rest });
}

function emptyStored(): StoredFilters {
  return { version: FILTER_STORAGE_VERSION, screens: {} };
}

function readStored(userId: string): StoredFilters | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(filterStorageKey(userId));

    return raw === null ? null : toStored(JSON.parse(raw));
  } catch {
    /* Armazenamento recusado ou JSON quebrado: preferência ausente, não tela quebrada. */
    return null;
  }
}

function toStored(parsed: unknown): StoredFilters | null {
  if (typeof parsed !== 'object' || parsed === null) return null;

  const { version, screens } = parsed as Partial<StoredFilters>;

  if (version !== FILTER_STORAGE_VERSION) return null;
  if (typeof screens !== 'object' || screens === null || Array.isArray(screens)) return null;

  return { version, screens };
}

function writeStored(userId: string, stored: StoredFilters): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(filterStorageKey(userId), JSON.stringify(stored));
  } catch {
    /* Gravação recusada (janela privada, cota cheia): o filtro vale nesta sessão e não
       sobrevive ao F5. É melhor que recusar o clique. */
  }
}
