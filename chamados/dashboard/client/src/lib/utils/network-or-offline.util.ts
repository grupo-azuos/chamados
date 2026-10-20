/** Falha de rede permite o aviso offline; respostas 401/403/500 continuam vindo do servidor. */
export async function networkOrOffline(
  request: Request,
  loadOffline: () => Promise<Response | undefined>,
): Promise<Response> {
  try {
    return await fetch(request);
  } catch {
    return (
      (await loadOffline()) ??
      new Response('Sem conexão. Conecte-se à internet e tente novamente.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    );
  }
}
