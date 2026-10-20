/** Navegação completa para o proxy exigir login novamente, sem reaproveitar a tela anterior. */
export function leaveSession(): void {
  window.location.replace('/');
}
