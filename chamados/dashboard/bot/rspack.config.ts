import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from '@rspack/cli';
import { rspack } from '@rspack/core';

/**
 * O build de produção do bot: um arquivo só (`dist/main.js`, ESM) com o Baileys e as bibliotecas
 * dentro. A imagem Docker não leva `node_modules`; fica mais leve e sobe mais rápido.
 *
 * Os testes e o `npm run dev` continuam pelo fonte (Vitest e tsx): este arquivo vale só para o
 * `npm run build`.
 */
const BOT_DIR = fileURLToPath(new URL('.', import.meta.url));

/* Pares opcionais do Baileys (miniatura, áudio, prévia de link): o bot só manda texto e nunca os
   carrega; o `ws` tenta os aceleradores nativos e segue sem eles. Sem eles instalados, o `import()` precisa falhar em runtime como antes, e não no build. */
const OPTIONAL_MODULES = [
  'sharp',
  'jimp',
  'link-preview-js',
  'audio-decode',
  'bufferutil',
  'utf-8-validate',
];

export default defineConfig({
  context: BOT_DIR,
  target: 'node24',
  mode: 'production',
  entry: { main: './src/main.ts' },
  output: {
    path: resolve(BOT_DIR, 'dist'),
    filename: '[name].js',
    clean: true,
    module: true,
    chunkFormat: 'module',
    library: { type: 'module' },
  },
  experiments: { outputModule: true },
  resolve: {
    extensions: ['.ts', '.js', '.json'],
    extensionAlias: { '.js': ['.ts', '.js'] },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        loader: 'builtin:swc-loader',
        options: { jsc: { parser: { syntax: 'typescript' }, target: 'es2023' } },
        type: 'javascript/auto',
      },
    ],
  },
  plugins: [
    new rspack.IgnorePlugin({ checkResource: (resource) => OPTIONAL_MODULES.includes(resource) }),
  ],
  optimization: { minimize: false },
  devtool: 'source-map',
});
