/* O id da sessão vira nome de pasta. Só o alfabeto abaixo passa: é o que impede um id como
   `../../etc` de sair da pasta de dados. */
const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

export function isValidSessionId(sessionId: string): boolean {
  return SESSION_ID_PATTERN.test(sessionId);
}

export function assertValidSessionId(sessionId: string): void {
  if (!isValidSessionId(sessionId)) throw new Error('Invalid session id');
}
