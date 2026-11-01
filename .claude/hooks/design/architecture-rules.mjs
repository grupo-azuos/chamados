/**
 * As regras das skills `design-system` e `ui-standards`, em código.
 *
 * Regra que só existe em markdown é sugestão: o agente lê, entende, e na terceira tela esquece.
 * Aqui cada regra vira uma função pura sobre a lista de arquivos do projeto — sem disco, sem rede —,
 * para o teste poder montar um projeto de mentira e provar que a regra pega o que deve.
 *
 * É o mesmo módulo que roda no `check:design` (CI, pre-push) e no hook `PostToolUse` do Claude Code —
 * por isso é `.mjs` puro, sem `tsx` e sem dependência: o hook precisa ser rápido em toda edição.
 *
 * Quem lê o disco e decide se o CI (ou o hook) reprova é o `check-design.mjs`.
 *
 * @typedef {Object} ProjectFile
 * @property {string} path - Caminho relativo à raiz do repositório, com `/`.
 * @property {string} content - Conteúdo; só é lido para arquivo de texto que alguma regra inspeciona.
 *
 * @typedef {Object} Violation
 * @property {string} rule
 * @property {string} file
 * @property {string} detail - O que está errado, sem número de linha: a chave da baseline não pode mudar a cada edição.
 * @property {number} [line]
 *
 * @typedef {Object} Rule
 * @property {string} id
 * @property {string} description - Uma linha, em pt-BR: aparece no relatório para quem vai corrigir.
 * @property {(files: ProjectFile[]) => Violation[]} check
 *
 * @typedef {Object.<string, number>} Baseline
 *
 * @typedef {Object} Comparison
 * @property {Violation[]} added - Violações a mais do que a baseline permite: é isso que reprova.
 * @property {string[]} fixed - Chaves que a baseline tinha e sumiram (ou diminuíram): dívida paga, falta atualizar.
 */

/** O prefixo de todo componente próprio (skill `design-system` I4). */
export const PREFIX = 'azuos-';

/** A raiz do client. O projeto tem um app só; a lista existe para o dia em que tiver dois. */
export const APPS = [{ name: 'client', src: 'chamados/dashboard/client/src' }];

/** Pastas permitidas em `lib` (skill `design-system` §2). */
export const LIB_FOLDERS = [
  'api',
  'auth',
  'components',
  'hooks',
  'motion',
  'navigation',
  'theme',
  'types',
  'utils',
  'view-models',
];

/**
 * O NOME DENUNCIA O COMPONENTE DE FEATURE — e é por ele que a regra decide, não pela contagem de
 * consumidores.
 *
 * "Usado por uma feature só" não serve de sinal AQUI: este repositório é um template, e nasce com UMA
 * feature de exemplo. Pela contagem, `azuos-page-header` e `azuos-status-badge` — que são o coração do
 * sistema de design — seriam empurrados para dentro de `routes/tasks/`, e a segunda tela teria de
 * trazê-los de volta. Uma regra que acusa o certo é uma regra que alguém desliga.
 *
 * O sinal que não erra é o primeiro da skill `design-system` §3.1: **nome da feature dentro de
 * `lib/components/`**. `azuos-task-list-view` só é usado por `routes/tasks` E carrega `task` no nome —
 * esse é de feature. `azuos-page-header` também só é usado por `routes/tasks`, mas não fala de tarefa
 * nenhuma — esse é genérico.
 *
 * O preço: um componente de domínio batizado sem o nome da entidade (`azuos-invoice-row` dentro da
 * feature `billing`) escapa. É um preço menor que o de uma regra que grita no lugar errado.
 *
 * @param {string} folder @param {string} feature
 */
function nameMentionsFeature(folder, feature) {
  if (feature === '*' || feature === '') return false;

  const name = (segments(folder).at(-1) ?? '').replace(new RegExp(`^${PREFIX}`), '');
  /* `tasks` casa com `task-list-view`: a pasta da rota é plural, o nome do componente é singular. */
  const singular = feature.replace(/s$/, '');

  return name.split('-').includes(singular) || name.split('-').includes(feature);
}

const RAW_PALETTE =
  /\b(?:text|bg|border|ring|fill|stroke|from|to|via)-(?:neutral|gray|slate|zinc|stone|red|rose|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink)-\d{2,3}\b/g;
const ARBITRARY_FONT = /\btext-\[\d+(?:\.\d+)?px\]/g;
const SIZE_RADIUS = /\brounded(?:-(?:xs|sm|md|lg|xl|2xl|3xl|\[[^\]]+\]))?(?=[\s"'`}]|$)/g;
const OFF_SCALE_SHADOW = /\bshadow(?:-(?:sm|md|lg|2xl|inner|\[[^\]]+\]))?(?=[\s"'`}]|$)/g;
const OFF_SCALE_HEIGHT = /\bh-(?:7|8|9|11|12)\b/g;
const RAW_INTERACTIVE = /<(button|input|select|textarea|table)\b/g;

/**
 * QUEM É CAMPO, pelo nome da pasta: `azuos-*-field`, `azuos-*-picker` e o `azuos-input-group`.
 *
 * É pelo nome porque é o nome que a casa já usa para campo de formulário e de filtro (skill
 * `design-system` §5) — e uma regra que dependesse de ler o JSX erraria a cada forma nova de montar.
 */
const FIELD_NAME = /(?:-field|-picker|^input-group)$/;
/**
 * Leva nome de campo, mas NÃO É um controle de uma linha — a régua de 40px e o canto de controle
 * não descrevem a forma dele:
 * - `filter-field`: moldura de rótulo em volta de um campo que vem pronto por `children`;
 * - `checkbox-field`: um quadradinho de marcar com o rótulo ao lado;
 * - `slider-field`: um trilho com uma bolinha;
 * - `otp-field`: uma fileira de casas quadradas, uma por dígito;
 * - `color-swatch-field`: uma fileira de quadradinhos de cor.
 */
const FIELD_WRAPPERS = [
  'filter-field',
  'checkbox-field',
  'slider-field',
  'otp-field',
  'color-swatch-field',
];
const FIELD_RADIUS = /\brounded-control\b/;
const FIELD_HEIGHT = /\bcontrol-lg\b/;
/** Área de texto: a altura é o número de linhas, então a régua de altura não entra. */
const MULTILINE = /<(?:textarea|Textarea)\b/;
/**
 * Campo que COMPÕE outro campo: importa um `azuos-*-field`, `azuos-*-picker` ou o
 * `azuos-input-group`. O canto e a altura vêm do campo de dentro (ou da constante de classes que
 * ele exporta), que já deve a régua por esta mesma regra — cobrar de novo de quem só põe rótulo e
 * mensagem de erro em volta obrigaria a repetir as classes num elemento que não é o controle.
 */
const COMPOSES_FIELD =
  /from\s+['"][^'"]*\/azuos-(?:[a-z0-9-]+-field|[a-z0-9-]+-picker|input-group)\/[^'"]+['"]/;

/** @param {string} path */
function segments(path) {
  return path.split('/');
}

/** O app que contém o caminho, ou `undefined` se ele não mora em nenhum (ex.: `server/`). */
/** @param {string} path @returns {{name: string, src: string} | undefined} */
function appOf(path) {
  return APPS.find((app) => path === app.src || path.startsWith(`${app.src}/`));
}

/** @param {{src: string}} app */
function libComponents(app) {
  return `${app.src}/lib/components`;
}

/** @param {{src: string}} app */
function libHooks(app) {
  return `${app.src}/lib/hooks`;
}

/** @param {{src: string}} app */
function viewModels(app) {
  return `${app.src}/lib/view-models`;
}

/** @param {{src: string}} app */
function routesDir(app) {
  return `${app.src}/routes`;
}

/** @param {string} path */
function isUi(path) {
  return path.includes('/components/ui/') || path.includes('/hooks/ui/');
}

/** @param {string} path */
function isStoryOrTest(path) {
  return /\.(stories|test)\.(ts|tsx)$/.test(path);
}

/**
 * Arquivo de rota: qualquer `.tsx` dentro de `routes`, fora de `/components/`. O `routeTree.gen.ts`
 * é gerado e fica de fora.
 * @param {string} path
 */
function isRouteFile(path) {
  const app = appOf(path);
  if (!app) return false;
  if (!path.startsWith(`${routesDir(app)}/`) || !path.endsWith('.tsx')) return false;

  return !path.includes('/components/');
}

/** Arquivo de componente próprio (genérico ou de feature), fora do CLI e fora de story/teste. */
/** @param {string} path */
function isOwnComponentSource(path) {
  if (!path.endsWith('.component.tsx') || isUi(path) || isStoryOrTest(path)) return false;
  const app = appOf(path);
  if (!app) return false;
  if (path.startsWith(`${libComponents(app)}/`)) return true;

  return new RegExp(`^${routesDir(app)}/.+/components/`).test(path);
}

/** Onde regra de classe Tailwind vale: componente próprio e arquivo de rota. */
/** @param {string} path */
function isStyledSource(path) {
  if (isOwnComponentSource(path)) return true;

  return isRouteFile(path) && !isStoryOrTest(path);
}

/** As pastas imediatas de componente: `lib/components/<x>` e `routes/**\/components/<x>`. */
/** @param {ProjectFile[]} files @returns {string[]} */
export function componentFolders(files) {
  const folders = new Set();

  for (const { path } of files) {
    if (isUi(path)) continue;
    const app = appOf(path);
    if (!app) continue;

    const lib = path.match(new RegExp(`^(${libComponents(app)}/[^/]+)/`));
    if (lib?.[1]) folders.add(lib[1]);

    const feature = path.match(new RegExp(`^(${routesDir(app)}/.+?/components/[^/]+)/`));
    if (feature?.[1]) folders.add(feature[1]);
  }

  return [...folders].sort();
}

/**
 * A feature de um arquivo de rota: `routes/tasks/index.tsx` → `tasks`. Um `.tsx` direto na raiz de
 * `routes` (o `__root.tsx`, o `index.tsx`) conta como "app inteiro" (`*`).
 * @param {string} path
 */
function featureOf(path) {
  const app = appOf(path);
  if (!app) return '';

  const parts = path.slice(routesDir(app).length + 1).split('/');
  if (parts.length <= 1) return '*';

  return parts[0].startsWith('__') ? '*' : parts[0];
}

function importerOwners(importer, folders, app, ownersOf) {
  if (isStoryOrTest(importer.path)) return [];
  const owner = folders.find((folder) => importer.path.startsWith(`${folder}/`));
  if (owner) return [...ownersOf(owner)];
  if (!importer.path.startsWith(`${routesDir(app)}/`)) return ['*'];

  return [featureOf(importer.path)];
}

/**
 * Para cada componente de `lib/components`, as features que o usam — seguindo a cadeia: se
 * `azuos-task-row` só é importado por `azuos-task-list-view`, e esse só pela rota `tasks`, os dois
 * são da feature `tasks`. O `__root.tsx` conta como "app inteiro" (`*`).
 * @param {ProjectFile[]} files @returns {Map<string, Set<string>>}
 */

export function featureOwners(files) {
  const libFolders = componentFolders(files).filter((folder) => {
    const app = appOf(folder);

    return app && folder.startsWith(`${libComponents(app)}/`);
  });
  const importersOf = new Map();

  for (const folder of libFolders) {
    const app = appOf(folder);
    const name = segments(folder).at(-1) ?? '';
    /* `<nome>/<nome>` e não `components/<nome>/<nome>`: aqui os imports são RELATIVOS, e um
       componente importando o irmão escreve `../azuos-x/azuos-x.component` — sem `components/` no
       caminho. Exigindo o prefixo, a cadeia lib -> lib ficava invisível e um componente de feature
       passava por genérico. O par repetido já é específico o bastante para não casar por acidente. */
    const importPath = `${name}/${name}`;
    importersOf.set(
      folder,
      files.filter(
        (file) =>
          appOf(file.path) === app &&
          !file.path.startsWith(`${folder}/`) &&
          file.content.includes(importPath),
      ),
    );
  }

  const memo = new Map();
  const resolving = new Set();

  const ownersOf = (folder) => {
    const cached = memo.get(folder);
    if (cached) return cached;
    /* Ciclo de import: trata como genérico para não reprovar por engano. */
    if (resolving.has(folder)) return new Set(['*']);
    resolving.add(folder);

    const owners = new Set();
    const app = appOf(folder);
    (importersOf.get(folder) ?? [])
      .flatMap((importer) => importerOwners(importer, libFolders, app, ownersOf))
      .forEach((owner) => owners.add(owner));

    resolving.delete(folder);
    memo.set(folder, owners);

    return owners;
  };

  for (const folder of libFolders) ownersOf(folder);
  /* Sem dono nenhum (componente que ninguém importa) não é "de feature": fica de fora. */
  for (const [folder, owners] of memo)
    if (owners.size === 0 || owners.has('*')) memo.delete(folder);

  return memo;
}

/** @param {string} content @param {number} index */
function lineOf(content, index) {
  return content.slice(0, index).split('\n').length;
}

/**
 * @param {ProjectFile} file
 * @param {string} rule
 * @param {RegExp} pattern
 * @param {(match: string, file: ProjectFile) => boolean} allowed
 * @returns {Violation[]}
 */
function fileClassViolations(file, rule, pattern, allowed) {
  if (!isStyledSource(file.path)) return [];

  return [...file.content.matchAll(pattern)]
    .filter((match) => !allowed(match[0], file))
    .map((match) => ({
      rule,
      file: file.path,
      detail: match[0],
      line: lineOf(file.content, match.index),
    }));
}

function classViolations(files, rule, pattern, allowed = () => false) {
  return files.flatMap((file) => fileClassViolations(file, rule, pattern, allowed));
}

/** `azuos-text-field` → `AzuosTextField`: o nome que a função exportada tem de ter. */
/** @param {string} folderName */
export function expectedExportName(folderName) {
  return folderName
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/** @type {Rule[]} */
/* ---------------------------------------------------------------- regras do grupo (13 sistemas) */

const GROUP_TONE =
  '(?:primary|destructive|success|warning|info|accent|brand-[a-z]+-\\d{2,3}|azuos-(?!border\\b)[a-z-]+|tone-[a-z]+-border|(?:red|rose|green|emerald|blue|sky|amber|yellow|orange|lime|teal|cyan|indigo|violet|purple|fuchsia|pink)-\\d{2,3})';
const COLORED_BORDER = new RegExp(
  `(?<![\\w-])((?:[\\w\\-\\[\\]=&*>~./]+:)*)!?(border(?:-[xytrblse])?|ring)-(${GROUP_TONE}|ring)(?:\\/\\d+)?(?![\\w-])`,
  'g',
);
const FOCUS_VARIANT = /focus|has-focus|has-\[/;
const GROUP_SOURCE = /\/client\/src\/.*\.(?:tsx|svelte)$/;
const GROUP_SKIP = /\.(?:test|stories|spec)\.|\.test\.svelte$|\.stories\.svelte$/;
const COMMENT_LINE = /^\s*(?:\*|\/\/|\/\*|<!--)/;

/** As linhas de código de um arquivo de tela, sem os comentários de linha inteira. */
function codeLines(file) {
  return file.content.split('\n').map((text, index) => ({ text, line: index + 1 }));
}


/** O anel de FOCO fica (acessibilidade); borda de foco, não. */
function isColoredBorder([, variants, kind, color]) {
  const isFocus = FOCUS_VARIANT.test(variants);
  if (kind === 'ring') return !isFocus;

  return color !== 'ring' || isFocus;
}

/** Só as telas do sistema; teste e story ficam de fora. */
function isGroupSource(file) {
  return GROUP_SOURCE.test(`/${file.path}`) && !GROUP_SKIP.test(file.path);
}

function borderLineViolations(file, { text, line }) {
  if (COMMENT_LINE.test(text) || text.includes('animate-spin')) return [];

  return [...text.matchAll(COLORED_BORDER)]
    .filter(isColoredBorder)
    .map(([whole]) => ({ rule: 'colored-border', file: file.path, detail: whole, line }));
}

/** @param {ProjectFile[]} files */
function coloredBorderViolations(files) {
  return files
    .filter(isGroupSource)
    .flatMap((file) => codeLines(file).flatMap((entry) => borderLineViolations(file, entry)));
}

function selectLineViolations(file, ownDropdown, { text, line }) {
  if (COMMENT_LINE.test(text)) return [];

  const out = [];
  if (/<select[\s>]/.test(text)) out.push({ rule: 'native-select', file: file.path, detail: '<select>', line });
  if (/captionLayout=\{?["'`]dropdown/.test(text) && !ownDropdown)
    out.push({ rule: 'native-select', file: file.path, detail: 'captionLayout="dropdown" sem lista própria', line });

  return out;
}

/** @param {ProjectFile[]} files */
function nativeSelectViolations(files) {
  return files.filter(isGroupSource).flatMap((file) => {
    const ownDropdown = /Dropdown\s*:/.test(file.content);

    return codeLines(file).flatMap((entry) => selectLineViolations(file, ownDropdown, entry));
  });
}

export const RULES = [
  {
    id: 'component-prefix',
    description: `Todo componente próprio mora em pasta \`${PREFIX}<nome>/\`.`,
    check: (files) =>
      componentFolders(files)
        .filter((folder) => !segments(folder).at(-1)?.startsWith(PREFIX))
        .map((folder) => ({
          rule: 'component-prefix',
          file: folder,
          detail: `pasta sem prefixo ${PREFIX}`,
        })),
  },
  {
    id: 'component-export-prefix',
    description: `A função exportada leva o prefixo no nome (\`${PREFIX}text-field\` → \`AzuosTextField\`).`,
    check: (files) =>
      files
        .filter((file) => isOwnComponentSource(file.path))
        .flatMap((file) => {
          const name =
            file.path
              .replace(/\.component\.tsx$/, '')
              .split('/')
              .at(-1) ?? '';
          const expected = expectedExportName(name);
          /* O `<` entra junto com o `(`: componente GENÉRICO é declarado
             `export function AzuosDataTable<TRow>(`, e exigir parêntese colado no nome
             reprovava justamente quem estava certo. */
          if (new RegExp(`export function ${expected}\\s*[(<]`).test(file.content)) return [];
          if (file.content.includes(`export class ${expected} `)) return [];

          return [
            {
              rule: 'component-export-prefix',
              file: file.path,
              detail: `sem export function ${expected}`,
            },
          ];
        }),
  },
  {
    id: 'component-siblings',
    description:
      'Todo componente próprio tem `.component.stories.tsx` e `.component.test.tsx` ao lado.',
    check: (files) => {
      const paths = new Set(files.map((file) => file.path));
      const out = [];

      for (const folder of componentFolders(files)) {
        const name = segments(folder).at(-1) ?? '';
        /* A porta de entrada do `ui/` é um `.ts` que só reexporta: não decide nada, não tem story
           nem teste. Quem ganha variante própria vira `.component.tsx` e passa a ter os dois. */
        if (!paths.has(`${folder}/${name}.component.tsx`)) continue;
        /* O teste e a story espelham o nome INTEIRO do arquivo, sufixo de papel incluso: a regra é
           "arquivo + `.test`", a mesma de `format-date.util.test.ts` e de `use-task-list.model.test.tsx`. */
        if (!paths.has(`${folder}/${name}.component.stories.tsx`))
          out.push({
            rule: 'component-siblings',
            file: folder,
            detail: 'sem .component.stories.tsx',
          });
        if (!paths.has(`${folder}/${name}.component.test.tsx`))
          out.push({ rule: 'component-siblings', file: folder, detail: 'sem .component.test.tsx' });
      }

      return out;
    },
  },
  {
    id: 'feature-component-in-lib',
    description:
      'Componente de `lib/components` que leva o nome de uma feature e só é usado por ela é de feature: mora em `routes/<feature>/components/`.',
    check: (files) =>
      [...featureOwners(files)]
        .filter(
          ([folder, owners]) =>
            owners.size === 1 && nameMentionsFeature(folder, [...owners][0] ?? ''),
        )
        .map(([folder, owners]) => ({
          rule: 'feature-component-in-lib',
          file: folder,
          detail: `só usado por routes/${[...owners][0]}`,
        })),
  },
  {
    id: 'hook-location',
    description: 'Hook próprio mora em `lib/hooks/use-<nome>/`; nada solto, nada sem `use-`.',
    check: (files) =>
      APPS.flatMap((app) => {
        const entries = new Set();
        for (const { path } of files) {
          const match = path.match(new RegExp(`^${libHooks(app)}/([^/]+)(/)?`));
          if (match?.[1]) entries.add(match[2] ? `${match[1]}/` : match[1]);
        }

        return [...entries]
          .filter((entry) => entry !== 'ui/' && !(entry.startsWith('use-') && entry.endsWith('/')))
          .map((entry) => ({
            rule: 'hook-location',
            file: `${libHooks(app)}/${entry.replace(/\/$/, '')}`,
            detail: entry.endsWith('/') ? 'pasta sem prefixo use-' : 'arquivo solto em lib/hooks',
          }));
      }),
  },
  {
    id: 'view-model-name',
    description: 'View-model é `lib/view-models/use-<nome>.model.ts`; util ao lado é `.util.ts`.',
    check: (files) =>
      APPS.flatMap((app) =>
        files
          .filter((file) => file.path.startsWith(`${viewModels(app)}/`))
          .filter((file) => !isStoryOrTest(file.path))
          .filter((file) => {
            const name = segments(file.path).at(-1) ?? '';

            return !/^use-[a-z0-9-]+\.model\.ts$/.test(name) && !/\.util\.ts$/.test(name);
          })
          .map((file) => ({
            rule: 'view-model-name',
            file: file.path,
            detail: 'fora de use-<nome>.model.ts',
          })),
      ),
  },
  {
    id: 'lib-folder',
    description: `Em \`lib\` só existem: ${LIB_FOLDERS.join(', ')}.`,
    check: (files) =>
      APPS.flatMap((app) => {
        const folders = new Set();
        for (const { path } of files) {
          const match = path.match(new RegExp(`^${app.src}/lib/([^/]+)/`));
          if (match?.[1]) folders.add(match[1]);
        }

        return [...folders]
          .filter((folder) => !LIB_FOLDERS.includes(folder))
          .map((folder) => ({
            rule: 'lib-folder',
            file: `${app.src}/lib/${folder}`,
            detail: 'pasta fora do mapa',
          }));
      }),
  },
  {
    id: 'ui-import-boundary',
    description: '`lib/components/ui` só é importado por componente de `lib/components`.',
    check: (files) =>
      files
        .filter((file) => {
          const app = appOf(file.path);

          return app && !file.path.startsWith(`${libComponents(app)}/`);
        })
        .filter((file) => /(?:lib\/)?components\/ui\//.test(file.content))
        .map((file) => ({
          rule: 'ui-import-boundary',
          file: file.path,
          detail: 'importa components/ui',
        })),
  },
  {
    id: 'cross-feature-import',
    description: 'Feature não importa componente de outra feature.',
    check: (files) =>
      files
        .filter((file) => {
          const app = appOf(file.path);

          return app && file.path.startsWith(`${routesDir(app)}/`);
        })
        .flatMap((file) =>
          /* `(?!lib\/)` é o que separa "componente de outra feature" de "componente genérico": o
             caminho para `lib/components` sobe o mesmo número de pastas e casaria igual. */
          [...file.content.matchAll(/from\s+['"](?:\.\.\/)+(?!lib\/)([a-z-]+)\/components\//g)].map(
            (match) => ({
              rule: 'cross-feature-import',
              file: file.path,
              detail: `importa componente de ${match[1]}`,
            }),
          ),
        ),
  },
  {
    id: 'route-markup',
    description:
      'Rota só compõe: nada de `<button>`, `<input>`, `<select>`, `<textarea>`, `<table>` cru.',
    check: (files) =>
      files
        .filter((file) => isRouteFile(file.path))
        .flatMap((file) =>
          [...file.content.matchAll(RAW_INTERACTIVE)].map((match) => ({
            rule: 'route-markup',
            file: file.path,
            detail: `<${match[1]}> na rota`,
            line: lineOf(file.content, match.index),
          })),
        ),
  },
  {
    id: 'route-height',
    description: 'A rota não define altura de controle; campo é `control-lg` no componente.',
    check: (files) =>
      classViolations(
        files.filter((file) => isRouteFile(file.path)),
        'route-height',
        OFF_SCALE_HEIGHT,
      ),
  },
  {
    id: 'radius-by-role',
    description:
      'Raio por papel: `rounded-surface|control|box|chip|full`, nunca `rounded-lg/xl/…`.',
    check: (files) =>
      classViolations(
        files,
        'radius-by-role',
        SIZE_RADIUS,
        /* A gaveta de baixo do celular tem o canto de cima arredondado por fora da escala: é a forma
           do bottom sheet, não um raio escolhido no olho. */
        (match, file) => file.path.includes(`/${PREFIX}responsive-dialog-content/`),
      ),
  },
  {
    id: 'field-ruler',
    description:
      'Todo campo (`azuos-*-field`, `azuos-*-picker`, `azuos-input-group`) tem `rounded-control` e `control-lg`.',
    /* As regras acima PROÍBEM o valor errado; esta EXIGE o certo. Sem ela, um campo novo que
       simplesmente não escreve canto nem altura passa limpo e herda os do componente baixado
       (`rounded-md`, `h-9`) — fica 6px menos arredondado e 4px mais baixo que os vizinhos. */
    check: (files) =>
      files
        .filter((file) => isOwnComponentSource(file.path))
        .flatMap((file) => {
          const name = (segments(file.path).at(-2) ?? '').replace(new RegExp(`^${PREFIX}`), '');
          if (!FIELD_NAME.test(name) || FIELD_WRAPPERS.includes(name)) return [];
          if (COMPOSES_FIELD.test(file.content)) return [];

          const out = [];
          if (!FIELD_RADIUS.test(file.content))
            out.push({ rule: 'field-ruler', file: file.path, detail: 'campo sem rounded-control' });
          if (!MULTILINE.test(file.content) && !FIELD_HEIGHT.test(file.content))
            out.push({ rule: 'field-ruler', file: file.path, detail: 'campo sem control-lg' });

          return out;
        }),
  },
  {
    id: 'raw-palette',
    description:
      'Cor só por token (`text-ink-*`, `bg-card`, `text-destructive`…), nunca paleta crua.',
    check: (files) => classViolations(files, 'raw-palette', RAW_PALETTE),
  },
  {
    id: 'arbitrary-font-size',
    description: 'Menor texto é `text-xs`; nada de `text-[11px]`.',
    check: (files) => classViolations(files, 'arbitrary-font-size', ARBITRARY_FONT),
  },
  {
    id: 'shadow-scale',
    description: 'Sombra só `shadow-xs` (repouso) e `shadow-xl` (flutuante).',
    check: (files) =>
      classViolations(
        files,
        'shadow-scale',
        OFF_SCALE_SHADOW,
        /* A única exceção: a gaveta de baixo do celular (`responsive-dialog-content`) usa
           `shadow-2xl`, porque ela flutua sobre a tela inteira. */
        (match, file) =>
          match === 'shadow-2xl' && file.path.includes(`/${PREFIX}responsive-dialog-content/`),
      ),
  },
  /* REGRA DO GRUPO (13 sistemas): cor de card vem do FUNDO, nunca da borda. Faixa lateral/topo
     colorida, contorno no tom e anel colorido de seleção são proibidos em QUALQUER componente.
     Fica só o anel de FOCO (acessibilidade). Card colorido: `AzuosToneCard`. */
  {
    id: 'colored-border',
    description:
      'Borda colorida é proibida em qualquer componente: a cor vem do fundo (`AzuosToneCard`). Só o anel de foco fica.',
    check: (files) => coloredBorderViolations(files),
  },
  /* REGRA DO GRUPO (13 sistemas): nunca `<select>` nativo — sempre o combobox do projeto. O
     calendário com `captionLayout="dropdown"` sem a lista própria (`components.Dropdown`) cai no
     `<select>` do navegador e conta também. */
  {
    id: 'native-select',
    description: 'Nunca `<select>` nativo: sempre o combobox/seletor personalizado do projeto.',
    check: (files) => nativeSelectViolations(files),
  },
  {
    id: 'doc-file-name',
    description: 'Arquivo em `docs/` tem nome kebab-case minúsculo (conteúdo segue pt-BR).',
    check: (files) =>
      files
        .filter((file) => /(^|\/)docs\/[^/]+\.md$/.test(file.path))
        .filter((file) => !/\/docs\/[a-z0-9]+(-[a-z0-9]+)*\.md$/.test(`/${file.path}`))
        .map((file) => ({
          rule: 'doc-file-name',
          file: file.path,
          detail: 'nome fora de kebab-case',
        })),
  },
];

/** A chave que a baseline conta: muda quando o problema muda, não quando a linha anda. */
/** @param {Violation} violation */
export function violationKey(violation) {
  return `${violation.rule}|${violation.file}|${violation.detail}`;
}

/** @param {Violation[]} violations @returns {Baseline} */
export function countByKey(violations) {
  const counts = {};
  for (const violation of violations) {
    const key = violationKey(violation);
    counts[key] = (counts[key] ?? 0) + 1;
  }

  return counts;
}

/** @param {Violation[]} violations @param {Baseline} baseline @returns {Comparison} */
export function compareWithBaseline(violations, baseline) {
  const seen = {};
  const added = [];

  for (const violation of violations) {
    const key = violationKey(violation);
    seen[key] = (seen[key] ?? 0) + 1;
    if (seen[key] > (baseline[key] ?? 0)) added.push(violation);
  }

  const fixed = Object.entries(baseline)
    .filter(([key, count]) => (seen[key] ?? 0) < count)
    .map(([key]) => key);

  return { added, fixed };
}

/**
 * As violações que tocam um arquivo editado: as dele mesmo, e as da pasta de componente onde ele mora
 * (a violação de `component-prefix`/`component-siblings` é registrada na PASTA, não no arquivo —
 * editar `azuos-x.component.tsx` precisa acusar a violação de `azuos-x/`).
 * @param {Violation[]} violations @param {string} path @returns {Violation[]}
 */
export function violationsTouching(violations, path) {
  return violations.filter(
    (violation) => path === violation.file || path.startsWith(`${violation.file}/`),
  );
}
