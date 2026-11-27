# Bibliotecas aprovadas

Antes de instalar uma biblioteca para uma necessidade que já apareceu em outro sistema do grupo,
use a MESMA biblioteca, na MESMA versão. Duas bibliotecas para o mesmo problema em sistemas
irmãos são o dobro de coisa para aprender, atualizar e corrigir.

## Já no template

| Para quê | Biblioteca | Versão |
|---|---|---|
| Grade do dashboard (arrastar e redimensionar blocos) | `react-grid-layout` | `^2.3.0` |
| Montador de filtro do dashboard (grupos E/OU) | `react-querybuilder` | `^8.26.0` |
| Ler PDF no navegador (páginas, miniaturas) | `pdfjs-dist` | `^6.3.289` |

## Aviso: usadas no Paralegal, ainda fora do template

Não estão instaladas aqui. Se um sistema precisar de algo parecido, **use estas** — e peça ao
suporte, porque cada uma traz configuração de servidor (segredo, armazenamento, imagem Docker).

| Para quê | Biblioteca | Versão no Paralegal |
|---|---|---|
| Guardar arquivos em armazenamento S3 | `@aws-sdk/client-s3` | `^3.1151.0` |
| Link temporário para baixar um arquivo do S3 | `@aws-sdk/s3-request-presigner` | `^3.1151.0` |
| Ler e conferir token JWT | `jose` | `^6.2.14` |
| Ler PDF no servidor | `pdfjs-dist` | `^6.3.289` |
| Desenhar a página do PDF como imagem no servidor | `@napi-rs/canvas` | `^1.0.9` |
| Ler texto de imagem (OCR) | `tesseract.js` | `^7.0.0` |
| Dicionário de português do OCR | `@tesseract.js-data/por` | `^1.0.0` |
| Banco Postgres (quando o sistema sai do SQLite) | `pg` + `@types/pg` | `^8.23.1` |
