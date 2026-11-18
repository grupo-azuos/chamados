/**
 * COLAR ARQUIVO COM CTRL+V num local de anexo (regra do grupo): os arquivos da área de
 * transferência — um print, um PDF copiado — entram pelo MESMO `<input type="file">` da área, como
 * se a pessoa os tivesse escolhido no seletor.
 *
 * Por isso não há um caminho novo para cada tela: o `onchange` que já trata a escolha (limite de
 * tamanho, aviso, envio) trata o que foi colado. Ponha no `onpaste` do elemento que contém o campo.
 *
 * Campo sem `multiple` recebe só o primeiro arquivo; campo desabilitado não recebe nada.
 */
export function pasteFilesIntoInput(event: ClipboardEvent & { currentTarget: EventTarget & HTMLElement }): void {
  const input = event.currentTarget.querySelector<HTMLInputElement>('input[type="file"]');
  const pasted = Array.from(event.clipboardData?.files ?? []);
  if (!input || input.disabled || pasted.length === 0) return;

  /* `DataTransfer` é o único jeito de montar um `FileList` — o navegador não deixa criar um. */
  if (typeof DataTransfer === 'undefined') return;

  const transfer = new DataTransfer();
  for (const file of input.multiple ? pasted : pasted.slice(0, 1)) transfer.items.add(file);

  event.preventDefault();
  input.files = transfer.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
}
