/**
 * Monta um .zip simples (método "store", sem compressão) inteiramente em memória.
 *
 * Sem compressão de propósito: o que pesa no pacote do agente é o MSI, que já vem comprimido —
 * comprimir de novo só gastaria CPU da API. E escrever o formato aqui, em poucas linhas, evita
 * trazer uma biblioteca nova só para isso. O Windows abre este zip pelo Explorer e pelo
 * `Expand-Archive`.
 */
export type ZipEntry = { name: string; content: Buffer };

const LOCAL_HEADER = 0x04034b50;
const CENTRAL_HEADER = 0x02014b50;
const END_OF_CENTRAL = 0x06054b50;
/** Bit 11: o nome do arquivo está em UTF-8. */
const UTF8_FLAG = 0x0800;
/** 2.0 — a versão mínima do formato para ler um arquivo guardado sem compressão. */
const VERSION = 20;
/** 1º de janeiro de 1980, a data mais antiga que o formato DOS do zip aceita. */
const DOS_DATE = (0 << 9) | (1 << 5) | 1;
const MAX_ENTRIES = 0xffff;
const MAX_BYTES = 0xffffffff;

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});

export function crc32(content: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of content) crc = (CRC_TABLE[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

export function createZipArchive(entries: ZipEntry[]): Buffer {
  if (entries.length === 0) throw new Error('Zip archive needs at least one entry');
  if (entries.length > MAX_ENTRIES) throw new Error('Too many entries for a zip archive');

  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8');
    const fields = { crc: crc32(entry.content), size: entry.content.length, name };
    const local = Buffer.concat([localHeader(fields), name, entry.content]);
    centrals.push(Buffer.concat([centralHeader(fields, offset), name]));
    locals.push(local);
    offset += local.length;
  }

  const central = Buffer.concat(centrals);
  if (offset + central.length > MAX_BYTES) throw new Error('Zip archive exceeds 4 GB');

  return Buffer.concat([...locals, central, endOfCentral(entries.length, central.length, offset)]);
}

type HeaderFields = { crc: number; size: number; name: Buffer };

function localHeader({ crc, size, name }: HeaderFields): Buffer {
  const header = Buffer.alloc(30);
  header.writeUInt32LE(LOCAL_HEADER, 0);
  header.writeUInt16LE(VERSION, 4);
  header.writeUInt16LE(UTF8_FLAG, 6);
  header.writeUInt16LE(0, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(DOS_DATE, 12);
  header.writeUInt32LE(crc, 14);
  header.writeUInt32LE(size, 18);
  header.writeUInt32LE(size, 22);
  header.writeUInt16LE(name.length, 26);
  header.writeUInt16LE(0, 28);
  return header;
}

function centralHeader({ crc, size, name }: HeaderFields, offset: number): Buffer {
  const header = Buffer.alloc(46);
  header.writeUInt32LE(CENTRAL_HEADER, 0);
  header.writeUInt16LE(VERSION, 4);
  header.writeUInt16LE(VERSION, 6);
  header.writeUInt16LE(UTF8_FLAG, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(0, 12);
  header.writeUInt16LE(DOS_DATE, 14);
  header.writeUInt32LE(crc, 16);
  header.writeUInt32LE(size, 20);
  header.writeUInt32LE(size, 24);
  header.writeUInt16LE(name.length, 28);
  header.writeUInt32LE(offset, 42);
  return header;
}

function endOfCentral(count: number, centralSize: number, centralOffset: number): Buffer {
  const footer = Buffer.alloc(22);
  footer.writeUInt32LE(END_OF_CENTRAL, 0);
  footer.writeUInt16LE(count, 8);
  footer.writeUInt16LE(count, 10);
  footer.writeUInt32LE(centralSize, 12);
  footer.writeUInt32LE(centralOffset, 16);
  return footer;
}
