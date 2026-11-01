/**
 * A FOTO QUE SAI DAQUI JÁ É PEQUENA — trazido do admin-console (`avatar-image.util.ts`).
 *
 * Uma foto de celular tem 3 a 6 MB; o servidor aceita 1 MB. Reduzir aqui, antes de enviar, é
 * o que faz "trocar a foto" funcionar com a foto que a pessoa tem — em vez de devolver "a foto
 * pode ter no máximo 1 MB" e deixá-la procurando um editor de imagem.
 *
 * O corte é o que a PESSOA escolheu no editor (`AzuosAvatarCropperDialog`): arrastar, aproximar e
 * girar. O quadrado central automático cortava a testa de quem tirou a foto um pouco acima do
 * centro, e o celular deitado chegava de lado.
 *
 * Os limites são os do admin-console (`avatar.schema.ts` de lá), que é quem guarda a foto: o
 * Chamados só mostra a foto que vem dele.
 */
export const AVATAR_CONTENT_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;

export type AvatarContentType = (typeof AVATAR_CONTENT_TYPES)[number];

export const MAX_AVATAR_BYTES = 1024 * 1024;

/** O lado do quadrado que a tela gera. Foto de perfil aparece a 40px; 256 cobre tela densa. */
export const AVATAR_EDGE_PX = 256;

/** O que vai para o envio: o tipo que o navegador produziu e a imagem em base64, sem prefixo. */
export type UploadAvatarInput = { contentType: AvatarContentType; data: string };

export class AvatarImageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AvatarImageError';
  }
}

/** A área que o editor devolve, em pixels da imagem já girada. */
export type CropArea = { x: number; y: number; width: number; height: number };

export type CropSelection = { area: CropArea; rotation: number };

/**
 * O tamanho da caixa que contém a imagem girada. O editor mede a área escolhida DENTRO dessa
 * caixa, então o desenho precisa acontecer nela — girar depois de cortar cortaria outro lugar.
 */
export function rotatedBoundingBox(
  width: number,
  height: number,
  rotation: number,
): { width: number; height: number } {
  const radians = (rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));

  return {
    width: Math.round(cos * width + sin * height),
    height: Math.round(sin * width + cos * height),
  };
}

/** Nunca aumenta a foto: uma imagem menor que `AVATAR_EDGE_PX` sai do tamanho que tem. */
export function outputEdge(area: CropArea): number {
  return Math.max(1, Math.min(AVATAR_EDGE_PX, Math.round(area.width)));
}

/**
 * Separa o tipo e o base64 de um `data:` URL.
 *
 * O tipo é LIDO do resultado, e não assumido: `canvas.toDataURL('image/webp')` devolve PNG em
 * navegador que não gera WebP, sem erro nenhum. Declarar WebP e mandar PNG seria recusado pelo
 * servidor, que confere os primeiros bytes.
 */
export function readDataUrl(dataUrl: string): UploadAvatarInput | null {
  const match = /^data:([^;,]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;

  const [, contentType, data] = match;
  const accepted = AVATAR_CONTENT_TYPES.find((type) => type === contentType);
  if (!accepted || !data) return null;

  return { contentType: accepted, data };
}

/** Bytes reais de um base64, sem decodificar: cada 4 caracteres são 3 bytes, menos o padding. */
export function base64ByteLength(data: string): number {
  const padding = data.endsWith('==') ? 2 : data.endsWith('=') ? 1 : 0;

  return Math.floor((data.length * 3) / 4) - padding;
}

export function assertIsImageFile(file: { type: string }): void {
  if (file.type.startsWith('image/')) return;

  throw new AvatarImageError('Escolha um arquivo de imagem (PNG, JPEG ou WebP).');
}

/**
 * Lê o arquivo, aplica o corte e a rotação escolhidos e reduz para `AVATAR_EDGE_PX`.
 *
 * Depende de `createImageBitmap` e de `<canvas>`, que o jsdom não tem — por isso as contas
 * acima são funções separadas, com teste, e esta só as costura.
 */
export async function toCroppedAvatarUpload(
  file: File,
  selection: CropSelection,
): Promise<UploadAvatarInput> {
  assertIsImageFile(file);

  const bitmap = await decode(file);
  const rotated = drawRotated(bitmap, selection.rotation);
  bitmap.close();

  const { area } = selection;
  const edge = outputEdge(area);
  const { canvas, context } = createCanvas(edge, edge);
  context.drawImage(rotated, area.x, area.y, area.width, area.height, 0, 0, edge, edge);

  const upload = readDataUrl(canvas.toDataURL('image/webp', 0.9));
  if (!upload) throw new AvatarImageError('Este navegador não conseguiu preparar a imagem.');
  if (base64ByteLength(upload.data) > MAX_AVATAR_BYTES) {
    throw new AvatarImageError('A foto ficou maior que 1 MB mesmo reduzida. Tente outra imagem.');
  }

  return upload;
}

/**
 * A imagem do editor, já girada — um `blob:` que quem pediu revoga quando trocar.
 *
 * O recorte do Svelte (`svelte-easy-crop`) não gira a imagem, como o `react-easy-crop` do
 * admin-console girava. Girar ANTES de entregar a imagem a ele dá o mesmo resultado: a área que
 * ele mede já fica no referencial da imagem girada, que é o que `toCroppedAvatarUpload` espera.
 */
export async function rotateImageUrl(url: string, rotation: number): Promise<string> {
  const image = await loadImage(url);
  const rotated = drawRotated(image, rotation);

  return new Promise((resolve, reject) => {
    rotated.toBlob((blob) => {
      if (!blob) {
        reject(new AvatarImageError('Este navegador não conseguiu girar a imagem.'));

        return;
      }
      resolve(URL.createObjectURL(blob));
    });
  });
}

/** A imagem inteira, girada dentro da caixa que a contém — o referencial da área escolhida. */
function drawRotated(
  source: CanvasImageSource & { width: number; height: number },
  rotation: number,
): HTMLCanvasElement {
  const box = rotatedBoundingBox(source.width, source.height, rotation);
  const { canvas, context } = createCanvas(box.width, box.height);

  context.translate(box.width / 2, box.height / 2);
  context.rotate((rotation * Math.PI) / 180);
  context.drawImage(source, -source.width / 2, -source.height / 2);

  return canvas;
}

function createCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) throw new AvatarImageError('Este navegador não conseguiu preparar a imagem.');

  return { canvas, context };
}

async function decode(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file);
  } catch {
    throw new AvatarImageError('Não consegui abrir esta imagem. Tente outro arquivo.');
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new AvatarImageError('Não consegui abrir esta imagem. Tente outro arquivo.'));
    image.src = url;
  });
}
