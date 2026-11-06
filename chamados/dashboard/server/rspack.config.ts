import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';

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

/* Pacotes que o Nest e o `pg` tentam carregar só se estiverem instalados (com ou sem subcaminho,
   com ou sem `.js`). Sem eles no projeto, o carregamento precisa falhar em runtime como antes, e não
   quebrar o build. */
const OPTIONAL_PACKAGES = [
  '@nestjs/microservices',
  '@nestjs/websockets',
  /* O adaptador padrão do WebSocket; quem usa WebSocket aqui escolhe o `@nestjs/platform-ws`. */
  '@nestjs/platform-socket.io',
  '@nestjs/platform-node',
  '@fastify/static',
  'class-transformer',
  'class-validator',
  'pg-native',
  /* ESM puro, carregado pelo Nest só no `FileTypeValidator`, que o projeto não usa. */
  'file-type',
];
/* O que o projeto declara em `dependencies` nunca é opcional: um app com WebSocket usa o
   `@nestjs/websockets`, e ignorá-lo tiraria os gateways do pacote sem erro nenhum no build. */
const DEPENDENCIES = Object.keys(
  JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf8')).dependencies ?? {},
);
const isOptional = (resource: string): boolean =>
  OPTIONAL_PACKAGES.some(
    (name) =>
      !DEPENDENCIES.includes(name) && (resource === name || resource.startsWith(`${name}/`)),
  );

const MIGRATE_CLI = './src/lib/db/migrate.cli.ts';

/* Arquivos que o código lê do disco (fontes, logos): os mesmos `assets` do `nest-cli.json` vão para
   `dist/<caminho>`, onde `serverAsset()` (`lib/config/server-root.ts`) os acha no container. */
const NEST_ASSETS: { include: string }[] =
  JSON.parse(readFileSync(resolve(__dirname, 'nest-cli.json'), 'utf8')).compilerOptions?.assets ??
  [];

/* O Swagger 12 serve a interface (CSS, JS, ícones) da pasta que o `swagger-ui-dist/absolute-path.js`
   devolve. Sem `node_modules` na imagem, os arquivos vão para `dist/swagger-ui` e esse arquivo é
   carregado de lá em runtime: devolve a própria pasta, e só ela é servida em `/docs` (se ele
   entrasse no pacote, devolveria `dist/` e o Swagger serviria o código do server). */
const SWAGGER_UI_DIR = 'swagger-ui';
const SWAGGER_UI_FILES = [
  'absolute-path.js',
  'swagger-ui.css',
  'swagger-ui-bundle.js',
  'swagger-ui-standalone-preset.js',
  'favicon-16x16.png',
  'favicon-32x32.png',
  'LICENSE',
  'NOTICE',
];
const SWAGGER_UI_DIST = dirname(createRequire(__filename).resolve('swagger-ui-dist/package.json'));

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
  externals: [
    ...NATIVE_MODULES,
    { 'swagger-ui-dist/absolute-path.js': `./${SWAGGER_UI_DIR}/absolute-path.js` },
  ],
  externalsType: 'commonjs',
  module: {
    /* Os pacotes ESM do Nest 12 (Swagger, serve-static) carregam outros por
       `createRequire(import.meta.url)`: assim eles entram no pacote, em vez de procurar
       `node_modules` em runtime — que não existe na imagem. */
    parser: { javascript: { createRequire: true } },
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
    new rspack.CopyRspackPlugin({
      patterns: SWAGGER_UI_FILES.map((file) => ({
        from: resolve(SWAGGER_UI_DIST, file),
        to: `${SWAGGER_UI_DIR}/${file}`,
      })),
    }),
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
      checkResource: isOptional,
    }),
  ],
  optimization: {
    /* Minifica, mas sem trocar nome de classe nem de função: o Nest usa o nome na injeção e nos
       logs, e o Swagger usa o da classe do DTO como nome do componente do contrato. */
    minimize: true,
    minimizer: [
      new rspack.SwcJsMinimizerRspackPlugin({
        minimizerOptions: {
          compress: { keep_classnames: true, keep_fnames: true },
          mangle: { keep_classnames: true, keep_fnames: true },
        },
      }),
    ],
  },
  /* Sem source map: o Node só o usa com `--enable-source-maps`, que o container não liga, e ele
     dobrava o tamanho do pacote na imagem. */
  devtool: false,
});
