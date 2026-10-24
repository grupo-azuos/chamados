import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { checkCommand, checkEdit, coloredBorderIn, nativeSelectIn } from './protect-app-shell.mjs';

const ROOT = mkdtempSync(join(tmpdir(), 'app-shell-'));
const SRC = 'app/client/src';

function file(path, content) {
  mkdirSync(join(ROOT, path, '..'), { recursive: true });
  writeFileSync(join(ROOT, path), content);
}

file(`${SRC}/routes/__root.tsx`, '<AzuosAppShell data={data}><Outlet /></AzuosAppShell>');
file(`${SRC}/lib/navigation/navigation.ts`, 'export const NAVIGATION: AppShellNavigation = {};');

// feliz
test('leaves the menu data free to change', () => {
  assert.equal(
    checkEdit(ROOT, {
      file_path: join(ROOT, `${SRC}/lib/navigation/navigation.ts`),
      old_string: "items: [",
      new_string: "items: [{ key: 'x', label: 'X', to: '/x', icon: X },",
    }),
    null,
  );
});

test('leaves any screen free to change', () => {
  assert.equal(
    checkEdit(ROOT, {
      file_path: join(ROOT, `${SRC}/routes/tasks/index.tsx`),
      content: '<AzuosPageHeader data={{ title: "Tarefas" }} />',
    }),
    null,
  );
});

test('lets read-only commands look at the shell', () => {
  assert.equal(checkCommand('cat app/client/src/lib/components/azuos-app-shell/x.tsx'), null);
  assert.equal(checkCommand('grep -rn Sidebar app/client/src/lib/components/ui/sidebar.tsx 2>/dev/null'), null);
});

// triste
test('refuses to edit the shell files', () => {
  for (const path of [
    `${SRC}/lib/components/azuos-app-shell/azuos-app-shell.component.tsx`,
    `${SRC}/lib/components/azuos-app-shell-mobile-bar/azuos-app-shell-mobile-bar.component.tsx`,
    `${SRC}/lib/components/ui/sidebar.tsx`,
    `${SRC}/lib/components/ui/sidebar/sidebar.svelte`,
    `${SRC}/lib/navigation/app-shell-navigation.ts`,
    `${SRC}/lib/components/azuos-my-profile-view/azuos-my-profile-view.component.tsx`,
    `${SRC}/lib/view-models/use-my-profile.model.ts`,
    `${SRC}/lib/api/account-profile.api.ts`,
    `${SRC}/routes/profile/index.tsx`,
    `${SRC}/routes/_shell/profile.tsx`,
    `${SRC}/routes/(app)/profile/+page.svelte`,
    `${SRC}/lib/hooks/use-my-profile/use-my-profile.svelte.ts`,
    `${SRC}/lib/components/azuos-account-view/azuos-account-view.component.tsx`,
    '.claude/settings.json',
  ]) {
    assert.match(checkEdit(ROOT, { file_path: join(ROOT, path), content: 'x' }) ?? '', /casca padrão/);
  }
});

test('refuses a second sidebar anywhere else', () => {
  assert.match(
    checkEdit(ROOT, {
      file_path: join(ROOT, `${SRC}/routes/tasks/index.tsx`),
      content: "import { Sidebar } from '../../lib/components/ui/sidebar';\n<Sidebar collapsible=\"icon\" />",
    }) ?? '',
    /fora da casca/,
  );
});

test('refuses a fixed bottom navigation bar', () => {
  assert.match(
    checkEdit(ROOT, {
      file_path: join(ROOT, `${SRC}/lib/components/azuos-foo/azuos-foo.component.tsx`),
      content: '<nav className="fixed inset-x-0 bottom-0">',
    }) ?? '',
    /fixa embaixo/,
  );
});

test('refuses a new shell-like component folder', () => {
  assert.match(
    checkEdit(ROOT, {
      file_path: join(ROOT, `${SRC}/lib/components/azuos-my-sidebar/azuos-my-sidebar.component.tsx`),
      content: 'x',
    }) ?? '',
    /segunda casca/,
  );
});

test('sends whoever asks for a profile or shell change to the support', () => {
  assert.match(
    checkEdit(ROOT, { file_path: join(ROOT, `${SRC}/routes/profile/index.tsx`), content: 'x' }) ?? '',
    /SUPORTE[\s\S]*chamados\.grupoazuos\.com\.br\/support/,
  );
});

test('refuses a second profile screen in a new folder', () => {
  assert.match(
    checkEdit(ROOT, {
      file_path: join(ROOT, `${SRC}/routes/team/components/azuos-team-profile-view/azuos-team-profile-view.component.tsx`),
      content: 'x',
    }) ?? '',
    /segunda casca/,
  );
});

test('leaves the data source of the profile free to change', () => {
  assert.equal(
    checkEdit(ROOT, {
      file_path: join(ROOT, `${SRC}/lib/view-models/use-profile.model.ts`),
      content: 'export function useProfileModel() {}',
    }),
    null,
  );
});

test('refuses to touch the profile from the terminal', () => {
  assert.ok(checkCommand('rm -rf app/client/src/lib/components/azuos-my-profile-view'));
  assert.ok(checkCommand('sed -i s/a/b/ app/client/src/routes/profile/index.tsx'));
});

test('refuses to take the shell out of the root route', () => {
  assert.match(
    checkEdit(ROOT, {
      file_path: join(ROOT, `${SRC}/routes/__root.tsx`),
      content: '<Outlet />',
    }) ?? '',
    /tirar a casca/,
  );
});

test('refuses to drop the NAVIGATION contract or put components in it', () => {
  const path = join(ROOT, `${SRC}/lib/navigation/navigation.ts`);

  assert.match(checkEdit(ROOT, { file_path: path, content: 'export const NAV_ITEMS = [];' }) ?? '', /contrato/);
  assert.match(
    checkEdit(ROOT, {
      file_path: path,
      old_string: 'export const',
      new_string: "import { X } from '../components/x';\nexport const",
    }) ?? '',
    /só DADOS/,
  );
});

test('refuses to touch the shell from the terminal', () => {
  assert.ok(checkCommand('sed -i s/a/b/ app/client/src/lib/components/azuos-app-shell/x.tsx'));
  assert.ok(checkCommand('rm -rf app/client/src/lib/components/azuos-zuzu'));
  assert.ok(checkCommand('echo x > app/client/src/lib/navigation/app-shell-navigation.ts'));
  assert.ok(checkCommand('git checkout -- app/client/src/lib/components/ui/sidebar.tsx'));
});

test('refuses to turn admin mode on or to skip the git hooks', () => {
  assert.ok(checkCommand('git config azuos.admin true'));
  assert.ok(checkCommand('git config --local project.admin true'));
  assert.ok(checkCommand('git commit -m "x" --no-verify'));
  assert.equal(checkCommand('git config --get azuos.admin'), null);
});

// regras de UI do grupo
test('refuses a colored border or a selection ring in any screen', () => {
  for (const content of [
    "<div className='rounded-surface border border-warning/40 bg-card' />",
    "<div className='border-l-4 border-l-destructive' />",
    "<div className='ring-2 ring-primary' />",
  ]) {
    assert.match(
      checkEdit(ROOT, { file_path: join(ROOT, `${SRC}/routes/tasks/index.tsx`), content }) ?? '',
      /borda colorida[\s\S]*AzuosToneCard/,
    );
  }
});

test('refuses the native select in any screen', () => {
  assert.match(
    checkEdit(ROOT, { file_path: join(ROOT, `${SRC}/routes/tasks/index.tsx`), content: '<select value={v} />' }) ?? '',
    /<select>` nativo/,
  );
});

test('lets the focus ring, neutral borders, spinners and comments through', () => {
  assert.equal(coloredBorderIn("<button className='border border-border focus-visible:ring-2 focus-visible:ring-ring/50' />"), null);
  assert.equal(coloredBorderIn("<span className='animate-spin border-2 border-primary border-t-transparent' />"), null);
  assert.equal(coloredBorderIn(' * antes: border-l-4 border-l-warning'), null);
  assert.equal(nativeSelectIn(' * nunca o `<select>` nativo'), false);
  assert.equal(
    checkEdit(ROOT, {
      file_path: join(ROOT, `${SRC}/routes/tasks/index.tsx`),
      content: "<AzuosToneCard ui={{ tone: 'danger', mode: 'interactive' }}>3</AzuosToneCard>",
    }),
    null,
  );
});
