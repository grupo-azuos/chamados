import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  APPS,
  LIB_FOLDERS,
  PREFIX,
  RULES,
  compareWithBaseline,
  componentFolders,
  countByKey,
  expectedExportName,
  featureOwners,
  violationKey,
  violationsTouching,
} from './architecture-rules.mjs';

/**
 * Cada regra é uma função pura sobre uma lista de arquivos, então o teste monta um PROJETO DE MENTIRA
 * e prova que a regra pega o que deve — e, o que importa mais, que ela NÃO pega o que é certo.
 *
 * Roda com `node --test .claude/hooks/design` (é o que o `npm run check:design:test` faz): sem
 * framework, porque o módulo testado também não tem dependência nenhuma.
 */

const SRC = APPS[0].src;

/** @param {Record<string, string>} tree */
function project(tree) {
  return Object.entries(tree).map(([path, content]) => ({ path, content }));
}

/** @param {string} id @param {ReturnType<typeof project>} files */
function run(id, files) {
  const rule = RULES.find((entry) => entry.id === id);
  assert.ok(rule, `Unknown rule: ${id}`);

  return rule.check(files);
}

/** Um componente completo e correto: pasta com prefixo, componente, story e teste. */
function component(folder, name, extra = {}) {
  const base = `${folder}/${PREFIX}${name}`;

  return {
    [`${base}/${PREFIX}${name}.component.tsx`]: `export function ${expectedExportName(PREFIX + name)}() { return null; }`,
    [`${base}/${PREFIX}${name}.component.stories.tsx`]: 'export default {};',
    [`${base}/${PREFIX}${name}.component.test.tsx`]: 'it("x", () => {});',
    ...extra,
  };
}

// ---------------------------------------------------------------- component-prefix

test('component-prefix: accepts prefixed folders', () => {
  // feliz
  const files = project(component(`${SRC}/lib/components`, 'text-field'));

  assert.deepEqual(run('component-prefix', files), []);
});

test('component-prefix: rejects folders without a prefix', () => {
  // triste
  const files = project({
    [`${SRC}/lib/components/text-field/text-field.component.tsx`]: 'export function TextField() {}',
  });

  const found = run('component-prefix', files);

  assert.equal(found.length, 1);
  assert.equal(found[0].file, `${SRC}/lib/components/text-field`);
});

test('component-prefix: ignores CLI-managed folders', () => {
  // triste (o `ui/` é do shadcn e não se renomeia)
  const files = project({ [`${SRC}/lib/components/ui/button.tsx`]: 'export function Button() {}' });

  assert.deepEqual(run('component-prefix', files), []);
});

// ---------------------------------------------------------- component-export-prefix

test('component-export-prefix: accepts a prefixed function name', () => {
  // feliz
  const files = project(component(`${SRC}/lib/components`, 'stat-card'));

  assert.deepEqual(run('component-export-prefix', files), []);
});

test('component-export-prefix: rejects functions without the prefix', () => {
  // triste
  const files = project({
    [`${SRC}/lib/components/${PREFIX}stat-card/${PREFIX}stat-card.component.tsx`]:
      'export function StatCard() { return null; }',
  });

  const found = run('component-export-prefix', files);

  assert.equal(found.length, 1);
  assert.match(found[0].detail, /AzuosStatCard/);
});

test('expectedExportName: converts a folder name into a function name', () => {
  // feliz
  assert.equal(expectedExportName('azuos-text-field'), 'AzuosTextField');
  assert.equal(expectedExportName('azuos-app-shell-nav-entry'), 'AzuosAppShellNavEntry');
});

// ---------------------------------------------------------------- component-siblings

test('component-siblings: accepts components with a story and a test', () => {
  // feliz
  const files = project(component(`${SRC}/lib/components`, 'empty-state'));

  assert.deepEqual(run('component-siblings', files), []);
});

test('component-siblings: rejects components missing a story and a test', () => {
  // triste
  const files = project({
    [`${SRC}/lib/components/${PREFIX}empty-state/${PREFIX}empty-state.component.tsx`]: 'x',
  });

  const details = run('component-siblings', files).map((violation) => violation.detail);

  assert.deepEqual(details.sort(), ['sem .component.stories.tsx', 'sem .component.test.tsx']);
});

test('component-siblings: exempts UI re-export entrypoints', () => {
  // feliz — um `.ts` que só reexporta não decide nada
  const files = project({
    [`${SRC}/lib/components/${PREFIX}dialog/${PREFIX}dialog.ts`]:
      "export { Dialog } from '../ui/dialog';",
  });

  assert.deepEqual(run('component-siblings', files), []);
});

// -------------------------------------------------------- feature-component-in-lib

test('feature-component-in-lib: rejects domain components in the library', () => {
  // triste — `task-row` carrega `task` no nome E só é usado por `routes/tasks`
  const files = project({
    ...component(`${SRC}/lib/components`, 'task-row'),
    [`${SRC}/routes/tasks/index.tsx`]: `import { AzuosTaskRow } from '../../lib/components/${PREFIX}task-row/${PREFIX}task-row.component';`,
  });

  const found = run('feature-component-in-lib', files);

  assert.equal(found.length, 1);
  assert.equal(found[0].detail, 'só usado por routes/tasks');
});

test('feature-component-in-lib: accepts components shared by two features', () => {
  // feliz
  const importLine = `import x from '../../lib/components/${PREFIX}task-row/${PREFIX}task-row.component';`;
  const files = project({
    ...component(`${SRC}/lib/components`, 'task-row'),
    [`${SRC}/routes/tasks/index.tsx`]: importLine,
    [`${SRC}/routes/reports/index.tsx`]: importLine,
  });

  assert.deepEqual(run('feature-component-in-lib', files), []);
});

test('feature-component-in-lib: keeps generic primitives in the library with one consumer', () => {
  /* feliz — pela CONTAGEM ele seria empurrado para dentro de `tasks`, e a segunda tela que precisasse
     de um gráfico o traria de volta. Quem decide é o NOME: `donut-chart` não fala de tarefa nenhuma. */
  const files = project({
    ...component(`${SRC}/lib/components`, 'donut-chart'),
    [`${SRC}/routes/tasks/index.tsx`]: `import x from '../../lib/components/${PREFIX}donut-chart/${PREFIX}donut-chart.component';`,
  });

  assert.deepEqual(run('feature-component-in-lib', files), []);
});

test('featureOwners: follows import chains to the owning route', () => {
  // feliz
  const files = project({
    ...component(`${SRC}/lib/components`, 'task-row'),
    ...component(`${SRC}/lib/components`, 'task-list'),
    [`${SRC}/lib/components/${PREFIX}task-list/${PREFIX}task-list.component.tsx`]: `import x from '../${PREFIX}task-row/${PREFIX}task-row.component'; export function AzuosTaskList() { return null; }`,
    [`${SRC}/routes/tasks/index.tsx`]: `import x from '../../lib/components/${PREFIX}task-list/${PREFIX}task-list.component';`,
  });

  const owners = featureOwners(files);

  assert.deepEqual([...(owners.get(`${SRC}/lib/components/${PREFIX}task-row`) ?? [])], ['tasks']);
});

// ---------------------------------------------------------------- hook-location

test('hook-location: accepts use-prefixed hook folders', () => {
  // feliz
  const files = project({
    [`${SRC}/lib/hooks/use-media-query/use-media-query.ts`]: 'export function useMediaQuery() {}',
  });

  assert.deepEqual(run('hook-location', files), []);
});

test('hook-location: rejects loose files and unprefixed hook folders', () => {
  // triste
  const files = project({
    [`${SRC}/lib/hooks/media-query.ts`]: 'x',
    [`${SRC}/lib/hooks/helpers/thing.ts`]: 'x',
  });

  const details = run('hook-location', files).map((violation) => violation.detail);

  assert.deepEqual(details.sort(), ['arquivo solto em lib/hooks', 'pasta sem prefixo use-']);
});

test('hook-location: exempts CLI-managed folders', () => {
  // feliz — `hooks/ui` é escrito pelo `shadcn add` e não se renomeia
  const files = project({ [`${SRC}/lib/hooks/ui/use-mobile.ts`]: 'x' });

  assert.deepEqual(run('hook-location', files), []);
});

// ---------------------------------------------------------------- view-model-name

test('view-model-name: accepts model filenames and adjacent utilities', () => {
  // feliz
  const files = project({
    [`${SRC}/lib/view-models/use-task-list.model.ts`]: 'x',
    [`${SRC}/lib/view-models/form-projection.util.ts`]: 'x',
  });

  assert.deepEqual(run('view-model-name', files), []);
});

test('view-model-name: rejects non-standard filenames', () => {
  // triste
  const files = project({ [`${SRC}/lib/view-models/taskList.ts`]: 'x' });

  assert.equal(run('view-model-name', files).length, 1);
});

// ---------------------------------------------------------------- lib-folder

test('lib-folder: accepts documented library folders', () => {
  // feliz
  const files = project(
    Object.fromEntries(LIB_FOLDERS.map((folder) => [`${SRC}/lib/${folder}/x.ts`, 'x'])),
  );

  assert.deepEqual(run('lib-folder', files), []);
});

test('lib-folder: rejects undocumented library folders', () => {
  // triste
  const files = project({ [`${SRC}/lib/context/thing.ts`]: 'x' });

  const found = run('lib-folder', files);

  assert.equal(found.length, 1);
  assert.equal(found[0].file, `${SRC}/lib/context`);
});

// ---------------------------------------------------------------- ui-import-boundary

test('ui-import-boundary: allows library components to wrap CLI UI', () => {
  // feliz
  const files = project({
    [`${SRC}/lib/components/${PREFIX}action-button/${PREFIX}action-button.component.tsx`]:
      "import { Button } from '../ui/button';",
  });

  assert.deepEqual(run('ui-import-boundary', files), []);
});

test('ui-import-boundary: rejects direct UI imports in routes', () => {
  // triste
  const files = project({
    [`${SRC}/routes/tasks/index.tsx`]: "import { Button } from '../../lib/components/ui/button';",
  });

  assert.equal(run('ui-import-boundary', files).length, 1);
});

// ---------------------------------------------------------------- cross-feature-import

test('cross-feature-import: allows routes to import generic library components', () => {
  // feliz — o caminho para `lib/components` sobe o mesmo número de pastas, e casaria sem a guarda
  const files = project({
    [`${SRC}/routes/tasks/index.tsx`]: `import x from '../../lib/components/${PREFIX}page-header/${PREFIX}page-header.component';`,
  });

  assert.deepEqual(run('cross-feature-import', files), []);
});

test('cross-feature-import: rejects imports across feature boundaries', () => {
  // triste
  const files = project({
    [`${SRC}/routes/tasks/index.tsx`]: `import x from '../reports/components/${PREFIX}report-row/${PREFIX}report-row.component';`,
  });

  const found = run('cross-feature-import', files);

  assert.equal(found.length, 1);
  assert.equal(found[0].detail, 'importa componente de reports');
});

// ---------------------------------------------------------------- route-markup / height

test('route-markup: accepts routes composing components', () => {
  // feliz
  const files = project({
    [`${SRC}/routes/tasks/index.tsx`]:
      'export default function Page() { return <AzuosTaskList />; }',
  });

  assert.deepEqual(run('route-markup', files), []);
});

test('route-markup: rejects raw interactive controls inside routes', () => {
  // triste
  const files = project({
    [`${SRC}/routes/tasks/index.tsx`]: 'const x = <button type="button">Salvar</button>;',
  });

  const found = run('route-markup', files);

  assert.equal(found.length, 1);
  assert.equal(found[0].detail, '<button> na rota');
});

test('route-height: rejects control heights defined in routes', () => {
  // triste — quem define altura de campo é o componente, pela régua
  const files = project({ [`${SRC}/routes/tasks/index.tsx`]: 'const x = "h-9 w-full";' });

  assert.equal(run('route-height', files).length, 1);
});

test('route-height: allows heights inside components', () => {
  // feliz
  const files = project({
    [`${SRC}/lib/components/${PREFIX}x/${PREFIX}x.component.tsx`]: 'const c = "h-9";',
  });

  assert.deepEqual(run('route-height', files), []);
});

// ---------------------------------------------------------------- classes

test('radius-by-role: accepts semantic radius tokens', () => {
  // feliz
  const files = project({
    [`${SRC}/lib/components/${PREFIX}x/${PREFIX}x.component.tsx`]:
      'const c = "rounded-surface rounded-control rounded-box rounded-chip rounded-full";',
  });

  assert.deepEqual(run('radius-by-role', files), []);
});

test('radius-by-role: rejects arbitrary radius sizes', () => {
  // triste
  const files = project({
    [`${SRC}/lib/components/${PREFIX}x/${PREFIX}x.component.tsx`]: 'const c = "rounded-lg";',
  });

  assert.equal(run('radius-by-role', files).length, 1);
});

test('field-ruler: accepts fields using the standard radius and height', () => {
  // feliz
  const files = project({
    [`${SRC}/lib/components/${PREFIX}select-field/${PREFIX}select-field.component.tsx`]:
      'const c = "control-lg rounded-control";',
    [`${SRC}/routes/orders/components/${PREFIX}order-picker/${PREFIX}order-picker.component.tsx`]:
      'const c = "control-lg rounded-control";',
    [`${SRC}/lib/components/${PREFIX}input-group/${PREFIX}input-group.component.tsx`]:
      'const c = "control-lg rounded-control";',
  });

  assert.deepEqual(run('field-ruler', files), []);
});

test('field-ruler: rejects fields missing the radius and height', () => {
  // triste
  const files = project({
    [`${SRC}/lib/components/${PREFIX}money-field/${PREFIX}money-field.component.tsx`]:
      'const c = "border px-3";',
  });

  assert.deepEqual(
    run('field-ruler', files).map((violation) => violation.detail),
    ['campo sem rounded-control', 'campo sem control-lg'],
  );
});

test('field-ruler: rejects a field using the wrong height tier', () => {
  // triste
  const files = project({
    [`${SRC}/lib/components/${PREFIX}date-picker/${PREFIX}date-picker.component.tsx`]:
      'const c = "control-md rounded-control";',
  });

  assert.deepEqual(
    run('field-ruler', files).map((violation) => violation.detail),
    ['campo sem control-lg'],
  );
});

test('field-ruler: requires only the radius for multiline fields', () => {
  const path = `${SRC}/lib/components/${PREFIX}text-area-field/${PREFIX}text-area-field.component.tsx`;

  // feliz
  assert.deepEqual(
    run('field-ruler', project({ [path]: '<textarea className="rounded-control" />' })),
    [],
  );
  // triste
  assert.deepEqual(
    run('field-ruler', project({ [path]: '<textarea className="border" />' })).map(
      (violation) => violation.detail,
    ),
    ['campo sem rounded-control'],
  );
});

test('field-ruler: ignores non-fields, label wrappers and CLI components', () => {
  // feliz
  const files = project({
    [`${SRC}/lib/components/${PREFIX}stat-card/${PREFIX}stat-card.component.tsx`]:
      'const c = "p-4";',
    [`${SRC}/lib/components/${PREFIX}filter-field/${PREFIX}filter-field.component.tsx`]:
      'const c = "flex flex-col";',
    [`${SRC}/lib/components/${PREFIX}checkbox-field/${PREFIX}checkbox-field.component.tsx`]:
      'const c = "size-4";',
    [`${SRC}/lib/components/ui/select.tsx`]: 'const c = "rounded-md h-9";',
    [`${SRC}/lib/components/${PREFIX}select-field/${PREFIX}select-field.component.test.tsx`]:
      'it("x", () => {});',
  });

  assert.deepEqual(run('field-ruler', files), []);
});

test('field-ruler: exempts wrappers composing another field', () => {
  const path = `${SRC}/lib/components/${PREFIX}form-select-field/${PREFIX}form-select-field.component.tsx`;

  // feliz
  assert.deepEqual(
    run(
      'field-ruler',
      project({
        [path]: `import { AzuosSelectField } from '../${PREFIX}select-field/${PREFIX}select-field.component';`,
      }),
    ),
    [],
  );
  // triste: importar componente que não é campo não isenta
  assert.equal(
    run(
      'field-ruler',
      project({
        [path]: `import { AzuosPersonAvatar } from '../${PREFIX}person-avatar/${PREFIX}person-avatar.component';`,
      }),
    ).length,
    2,
  );
});

test('raw-palette: rejects raw colors and accepts semantic tokens', () => {
  const folder = `${SRC}/lib/components/${PREFIX}x/${PREFIX}x.component.tsx`;

  // triste
  assert.equal(run('raw-palette', project({ [folder]: 'const c = "bg-emerald-100";' })).length, 1);
  // feliz
  assert.deepEqual(run('raw-palette', project({ [folder]: 'const c = "bg-success-soft";' })), []);
});

test('arbitrary-font-size: rejects arbitrary text sizes', () => {
  const folder = `${SRC}/lib/components/${PREFIX}x/${PREFIX}x.component.tsx`;

  // triste
  assert.equal(
    run('arbitrary-font-size', project({ [folder]: 'const c = "text-[11px]";' })).length,
    1,
  );
  // feliz
  assert.deepEqual(run('arbitrary-font-size', project({ [folder]: 'const c = "text-xs";' })), []);
});

test('shadow-scale: accepts xs and xl while rejecting other shadows', () => {
  const folder = `${SRC}/lib/components/${PREFIX}x/${PREFIX}x.component.tsx`;

  // feliz
  assert.deepEqual(
    run('shadow-scale', project({ [folder]: 'const c = "shadow-xs shadow-xl";' })),
    [],
  );
  // triste
  assert.equal(run('shadow-scale', project({ [folder]: 'const c = "shadow-lg";' })).length, 1);
});

test('shadow-scale: exempts the mobile bottom sheet', () => {
  // feliz — ela flutua sobre a tela inteira
  const path = `${SRC}/lib/components/${PREFIX}responsive-dialog-content/${PREFIX}responsive-dialog-content.component.tsx`;

  assert.deepEqual(run('shadow-scale', project({ [path]: 'const c = "shadow-2xl";' })), []);
});

// ---------------------------------------------------------------- doc-file-name

test('doc-file-name: accepts kebab-case and rejects uppercase names', () => {
  // feliz
  assert.deepEqual(run('doc-file-name', project({ 'chamados/dashboard/docs/architecture.md': 'x' })), []);
  // triste
  assert.equal(run('doc-file-name', project({ 'chamados/dashboard/docs/ARQUITETURA.md': 'x' })).length, 1);
});

// ---------------------------------------------------------------- baseline

test('compareWithBaseline: accepts known violations and rejects new ones', () => {
  const known = { rule: 'raw-palette', file: 'a.tsx', detail: 'bg-red-500' };
  const fresh = { rule: 'raw-palette', file: 'b.tsx', detail: 'bg-blue-500' };

  // feliz
  const { added } = compareWithBaseline([known, fresh], countByKey([known]));

  assert.deepEqual(added, [fresh]);
});

test('compareWithBaseline: reports resolved debt', () => {
  // feliz — é o que manda a pessoa regravar a baseline menor
  const known = { rule: 'raw-palette', file: 'a.tsx', detail: 'bg-red-500' };

  const { added, fixed } = compareWithBaseline([], countByKey([known]));

  assert.deepEqual(added, []);
  assert.deepEqual(fixed, [violationKey(known)]);
});

test('compareWithBaseline: counts duplicate violations separately', () => {
  // triste — sem a contagem, a segunda cor crua no mesmo arquivo entraria de graça
  const one = { rule: 'raw-palette', file: 'a.tsx', detail: 'bg-red-500' };

  const { added } = compareWithBaseline([one, one], countByKey([one]));

  assert.equal(added.length, 1);
});

test('violationKey: stays stable when source line numbers change', () => {
  // feliz — a chave da baseline não pode depender da linha, ou toda edição a invalidaria
  const key = violationKey({ rule: 'r', file: 'a.tsx', detail: 'd', line: 10 });

  assert.equal(key, violationKey({ rule: 'r', file: 'a.tsx', detail: 'd', line: 99 }));
});

// ---------------------------------------------------------------- violationsTouching

test('violationsTouching: includes the edited file violations', () => {
  // feliz
  const mine = { rule: 'r', file: 'a/b.tsx', detail: 'd' };
  const other = { rule: 'r', file: 'c/d.tsx', detail: 'd' };

  assert.deepEqual(violationsTouching([mine, other], 'a/b.tsx'), [mine]);
});

test('violationsTouching: includes component folder violations', () => {
  /* `component-prefix` e `component-siblings` são registradas na pasta: editar o componente tem de
     acusar a violação da pasta, ou o hook ficaria calado justamente no arquivo em que a pessoa está. */
  const folder = {
    rule: 'component-siblings',
    file: 'a/azuos-x',
    detail: 'sem .component.test.tsx',
  };

  assert.deepEqual(violationsTouching([folder], 'a/azuos-x/azuos-x.component.tsx'), [folder]);
});

// ---------------------------------------------------------------- componentFolders

test('componentFolders: finds library and feature folders while ignoring CLI UI', () => {
  // feliz
  const files = project({
    [`${SRC}/lib/components/${PREFIX}a/${PREFIX}a.component.tsx`]: 'x',
    [`${SRC}/routes/tasks/components/${PREFIX}b/${PREFIX}b.component.tsx`]: 'x',
    [`${SRC}/lib/components/ui/button.tsx`]: 'x',
  });

  assert.deepEqual(componentFolders(files), [
    `${SRC}/lib/components/${PREFIX}a`,
    `${SRC}/routes/tasks/components/${PREFIX}b`,
  ]);
});

// ---------------------------------------------------------------- regras do grupo (13 sistemas)

test('colored-border: refuses a colored border, a side stripe and a selection ring', () => {
  const files = project({
    [`${SRC}/lib/components/azuos-x/azuos-x.component.tsx`]: [
      "<div className='rounded-surface border border-destructive/40 bg-card' />",
      "<div className='border-l-4 border-l-warning' />",
      "<div className='ring-2 ring-primary' />",
      "<input className='aria-invalid:border-destructive' />",
    ].join('\n'),
  });

  const details = run('colored-border', files).map((violation) => violation.detail);
  assert.ok(details.includes('border-destructive/40'));
  assert.ok(details.includes('border-l-warning'));
  assert.ok(details.includes('ring-primary'));
  assert.ok(details.includes('aria-invalid:border-destructive'));
});

test('colored-border: lets the focus ring, neutral borders, spinners and comments through', () => {
  const files = project({
    [`${SRC}/lib/components/azuos-x/azuos-x.component.tsx`]: [
      "<button className='border border-border focus-visible:ring-2 focus-visible:ring-ring/50' />",
      "<div className='bg-destructive-soft text-ink-900' />",
      "<span className='size-4 animate-spin rounded-full border-2 border-primary border-t-transparent' />",
      ' * antes era `border-l-4 border-l-warning`, agora não é mais',
    ].join('\n'),
  });

  assert.deepEqual(run('colored-border', files), []);
});

test('native-select: refuses the HTML select and a calendar dropdown without our list', () => {
  const files = project({
    [`${SRC}/lib/components/azuos-x/azuos-x.component.tsx`]: '<select value={v}><option /></select>',
    [`${SRC}/lib/components/azuos-y/azuos-y.component.tsx`]: '<Calendar captionLayout="dropdown" />',
  });

  assert.equal(run('native-select', files).length, 2);
});

test('native-select: lets the calendar with its own list and a comment about select through', () => {
  const files = project({
    [`${SRC}/lib/components/azuos-x/azuos-x.component.tsx`]: [
      ' * A lista é a nossa, não o `<select>` nativo.',
      '<Calendar captionLayout="dropdown" components={{ Dropdown: AzuosCalendarDropdown }} />',
    ].join('\n'),
  });

  assert.deepEqual(run('native-select', files), []);
});
