/**
 * ARRASTAR E SOLTAR com o recurso nativo do navegador — sem biblioteca.
 *
 * O que viaja no arrasto é só o identificador, como texto. Quem solta (uma coluna do quadro,
 * um dia do calendário) lê o identificador e avisa a tela; ninguém guarda "o item que está
 * sendo arrastado" numa variável solta, que ficaria presa quando o arrasto é cancelado.
 */
const FORMAT = 'text/plain';

type DragEventLike = {
  dataTransfer: Pick<DataTransfer, 'setData' | 'getData'> & { effectAllowed?: string };
};

export function writeDragItem(event: DragEventLike, id: number | string): void {
  event.dataTransfer.setData(FORMAT, String(id));
  event.dataTransfer.effectAllowed = 'move';
}

/** O identificador arrastado, ou `null` quando o que chegou não veio de um item da tela. */
export function readDragItem(event: DragEventLike): number | null {
  const raw = event.dataTransfer.getData(FORMAT);
  const id = Number(raw);

  return raw !== '' && Number.isInteger(id) ? id : null;
}
