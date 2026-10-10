# Bot de WhatsApp

O bot é o programa que conversa com o WhatsApp. Ele fica **inteiro** em `acerola/dashboard/bot/`
e é separado do resto: o servidor de chamados não conhece o WhatsApp, só a API HTTP do bot.

> **Situação:** esta é a primeira etapa. O bot já vincula um número (QR code), guarda a conexão
> cifrada e envia mensagem de texto. A tela de vínculo no perfil e o uso pelos chamados entram
> nas próximas etapas (issue #18).

## Por que é um programa à parte

1. **Troca futura.** Hoje quem fala com o WhatsApp é o [Baileys](https://github.com/WhiskeySockets/Baileys),
   que não é oficial. No dia em que a API oficial do WhatsApp entrar, troca-se só a camada de
   transporte do bot (`src/transport/`); o servidor e a tela não mudam.
2. **Licença.** O Baileys depende de código GPL-3.0 (`libsignal`). Num programa à parte — com
   instalação, processo e imagem Docker próprios — essa licença não alcança o resto do projeto,
   que é MIT. Detalhes em `THIRD-PARTY-NOTICES.md`.

Por isso o bot **não** é um workspace do `package.json` da raiz: tem `package.json` e
`package-lock.json` próprios, e o `npm install` do painel não instala nada dele.

## Rodar na sua máquina

```bash
cd acerola/dashboard
npm run bot:install            # instala as dependências do bot (uma vez)
cp bot/.env.example bot/.env   # e preencha BOT_API_TOKEN e BOT_SESSION_KEY
npm run dev:bot                # sobe em http://127.0.0.1:3010
```

Para conferir lint, tipos e testes do bot: `npm run bot:check`.

## Rodar com Docker

```bash
cd acerola/dashboard
docker compose -f docker/compose.yml --profile whatsapp up --build
```

O bot tem o único volume do projeto (`bot-data`): as conexões cifradas dos números vinculados.
Perder o volume não perde dado de chamado — só obriga cada pessoa a ler o QR code de novo.
O sistema roda com **uma instância só** do bot: a conexão com o WhatsApp fica viva dentro dele.

## A API

Tudo, menos `/health`, exige `Authorization: Bearer <BOT_API_TOKEN>`. O `:id` é o id do usuário
dono do número.

| Chamada | O que faz |
|---|---|
| `GET /health` | Está de pé? Sem token. |
| `GET /sessions/:id` | Situação do vínculo: `disconnected`, `pairing` (com o `qr`) ou `connected` (com o `phone`). |
| `POST /sessions/:id/link` | Começa o vínculo. O QR code aparece na situação alguns segundos depois. |
| `DELETE /sessions/:id` | Desvincula: encerra no WhatsApp e apaga a conexão guardada. |
| `POST /sessions/:id/messages` | Manda texto: `{ "to": "5562999990001", "text": "..." }`. |

Respostas de erro do envio: `409` (`not_connected`) quando o número não está conectado, `422`
(`recipient_not_found`) quando o destino não tem WhatsApp.

## Segurança

- **A API não fica na internet.** O bot escuta só em `127.0.0.1` por padrão; no Docker, só na
  rede interna do compose. Quem tem o `BOT_API_TOKEN` manda mensagem pelo WhatsApp de qualquer
  pessoa vinculada.
- **A conexão é cifrada em disco** (AES-256-GCM, chave em `BOT_SESSION_KEY`). Quem tem esses
  dados é aquele WhatsApp: lê e manda mensagem como a pessoa. Nem o nome dos arquivos revela
  telefone.
- **Trocar `BOT_SESSION_KEY` invalida todos os vínculos.**
- **Banimento.** O Baileys não é oficial, e o WhatsApp pode banir números que usam automação.
  O teto de mensagens por pessoa e os alertas ficam no servidor (próxima etapa).

## Onde fica cada coisa

```
bot/src/config/      variáveis de ambiente, validadas na subida
bot/src/store/       onde a conexão fica guardada (cifrada)
bot/src/transport/   a porta do WhatsApp e quem a atende hoje (Baileys) — a parte que será trocada
bot/src/http/        a API que o servidor chama
```
