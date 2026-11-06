import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { defineConfig } from '@rspack/cli';
import { rspack } from '@rspack/core';

/**
 * O build de produção do server: um arquivo só (`dist/main.js`) com o Nest, as bibliotecas e o
 * `shared` dentro. A imagem Docker não leva `node_modules`; fica mais leve e sobe mais rápido.
 *
 * Os testes e o `npm run dev` continuam pelo fonte (Vitest e Nest CLI): este arquivo vale só
 * para o `npm run build`.
 */

/* Módulo nativo (`.node`) não entra no pacote. Este app não tem nenhum: o `pg` é JavaScript puro
   e entra no pacote. */
const NATIVE_MODULES: string[] = [];

/* Pacotes que o Nest e o `pg` tentam carregar só se estiverem instalados. Sem eles no projeto, o
   `require` precisa falhar em runtime como antes, e não quebrar o build. */
const OPTIONAL_MODULES = [
  '@nestjs/microservices',
  '@nestjs/microservices/microservices-module',
  '@nestjs/websockets/socket-module',
  '@fastify/static',
  'class-transformer',
  'class-transformer/storage',
  'class-validator',
  'pg-native',
  /* ESM puro, carregado pelo Nest só no `FileTypeValidator`, que o projeto não usa. */
  'file-type',
];

const MIGRATE_CLI = './src/lib/db/migrate.cli.ts';

/* Arquivos que o código lê do disco (fontes, logos): os mesmos `assets` do `nest-cli.json` vão para
   `dist/<caminho>`, onde `serverAsset()` (`lib/config/server-root.ts`) os acha no container. */
const NEST_ASSETS: { include: string }[] =
  JSON.parse(readFileSync(resolve(__dirname, 'nest-cli.json'), 'utf8')).compilerOptions?.assets ??
  [];

export default defineConfig({
  context: __dirname,
  target: 'node24',
  mode: 'production',
  /* `main` sobe a API. O job de migration do deploy (`docker/migration/compose.yml`) roda
     `dist/lib/db/migrate.cli.js`, que só existe depois da promoção para PostgreSQL. */
  entry: {
    main: './src/main.ts',
    ...(existsSync(resolve(__dirname, MIGRATE_CLI)) && { 'lib/db/migrate.cli': MIGRATE_CLI }),
  },
  output: {
    path: resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true,
    library: { type: 'commonjs2' },
  },
  /* `__dirname` é a pasta do `dist/main.js`, e não a do arquivo-fonte: o código acha `server/`
     subindo até o `package.json` (`lib/config/server-root.ts`). */
  node: { __dirname: false, __filename: false },
  resolve: {
    extensions: ['.ts', '.js', '.json'],
    /* O `shared` entra pelo código-fonte, como no client: o pacote não depende do `shared/dist`. */
    alias: {
      '@template/shared': resolve(__dirname, '../shared/src'),
    },
    extensionAlias: { '.js': ['.ts', '.js'] },
  },
  externals: NATIVE_MODULES,
  externalsType: 'commonjs',
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        loader: 'builtin:swc-loader',
        options: {
          jsc: {
            parser: { syntax: 'typescript', decorators: true },
            /* O Nest lê o tipo dos parâmetros pelos metadados dos decorators. */
            transform: { legacyDecorator: true, decoratorMetadata: true },
            target: 'es2023',
          },
        },
        type: 'javascript/auto',
      },
    ],
  },
  plugins: [
    ...(NEST_ASSETS.length > 0
      ? [
          new rspack.CopyRspackPlugin({
            patterns: NEST_ASSETS.map(({ include }) => ({
              from: include,
              context: resolve(__dirname, 'src'),
            })),
          }),
        ]
      : []),
    new rspack.IgnorePlugin({
      checkResource: (resource) => OPTIONAL_MODULES.includes(resource),
    }),
  ],
  optimization: {
    /* Nome de classe é usado pelo Nest para a injeção e pelos logs: não se minifica. */
    minimize: false,
  },
  devtool: 'source-map',
});
