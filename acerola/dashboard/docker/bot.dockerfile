# A imagem do bot de WhatsApp — separada da imagem do sistema DE PROPÓSITO.
#
# O Baileys depende de código GPL-3.0 (libsignal). Mantê-lo num programa e numa imagem à parte é
# o que deixa o resto do projeto MIT: a imagem do sistema (dockerfile) não leva nada daqui.
#
# O contexto do build é a pasta `bot/` (ver compose.yml).
FROM node:24-bookworm-slim AS build
WORKDIR /bot
COPY package.json package-lock.json .npmrc ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build && npm prune --omit=dev --omit=peer --ignore-scripts

FROM node:24-bookworm-slim AS app
WORKDIR /bot
ENV NODE_ENV=production
COPY --from=build /bot/package.json package.json
COPY --from=build /bot/node_modules node_modules
COPY --from=build /bot/dist dist
# As conexões cifradas ficam num volume, e o processo não roda como root.
RUN mkdir /data && chown node:node /data
USER node
ENV BOT_DATA_DIR=/data
EXPOSE 3010
CMD ["node", "dist/main.js"]
