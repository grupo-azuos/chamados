#!/usr/bin/env node
/**
 * A TRAVA DA CASCA PADRÃO — skill `app-shell-standard`.
 *
 * O app-shell (barra lateral, trilho de ícones, barra de baixo do celular, gaveta, rodapé com
 * perfil e Sair, o Zuzu) é O MESMO nos 13 sistemas do Grupo Azuos. Este hook recusa, para quem
 * não administra, qualquer tentativa de mudar esse padrão pelo Claude:
 *
 *   1. editar os arquivos da casca e da tela "Meu perfil" (lista `PROTECTED`) — quem pede vai
 *      para o suporte;
 *   2. desenhar outra barra/menu em qualquer outro arquivo (`<Sidebar…>`, `useSidebar`,
 *      `collapsible=`, `<nav>` fixo embaixo, pasta nova `azuos-*shell*`/`*sidebar*`…);
 *   3. tirar a casca da rota raiz, ou tirar o `NAVIGATION` do `navigation.ts`;
 *   4. mexer nesses arquivos pelo terminal (`sed -i`, `rm`, `mv`, `>`, `git checkout --`…);
 *   5. ligar o modo admin sozinho ou pular os hooks do git (`--no-verify`).
 *
 * O que CONTINUA livre: os DADOS do menu em `lib/navigation/navigation.ts` (telas, partes,
 * atalhos), o conteúdo das telas e tudo o mais do sistema.
 *
 * Quem administra libera a própria máquina, no próprio terminal, UMA vez:
 *
 *   git config azuos.admin true      (no chamados: git config project.admin true)
 *
 * Falha deste hook BLOQUEIA (fail closed): uma trava que some quando quebra não é trava.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ADMIN_KEYS = ['azuos.admin', 'project.admin'];

/** Os arquivos da casca padrão — iguais nos 13 sistemas. Caminho relativo à raiz do repo. */
export const PROTECTED = [
  /\/client\/src\/lib\/components\/azuos-app-shell[^/]*\//,
  /\/client\/src\/lib\/components\/azuos-zuzu\//,
  /\/client\/src\/lib\/components\/azuos-brand-mark\//,
  /\/client\/src\/lib\/components\/azuos-sidebar-controls\//,
  /\/client\/src\/lib\/components\/ui\/(sidebar|sheet|tooltip)(\.tsx$|\/)/,
  /\/client\/src\/lib\/navigation\/app-shell-navigation[^/]*$/,
  /\/client\/src\/lib\/view-models\/use-app-shell-navigation\.model[^/]*$/,
  /\/client\/src\/lib\/view-models\/use-account-session\.model[^/]*$/,
  /\/client\/src\/lib\/api\/account-session\.api[^/]*$/,
  /\/client\/src\/lib\/components\/azuos-my-profile-view\//,
  /* Os componentes de UI padrão do grupo: card colorido, número de relance, lista de mês/ano. */
  /\/client\/src\/lib\/components\/azuos-(tone-card|stat-card|calendar-dropdown)\//,
  /\/client\/src\/lib\/view-models\/use-my-profile\.model[^/]*$/,
  /\/client\/src\/lib\/api\/account-profile\.api[^/]*$/,
  /\/client\/src\/lib\/hooks\/use-my-profile\//,
  /* A TELA "Meu perfil": a rota de cada sistema e, no admin-console, a ficha com os formulários. */
  /\/client\/src\/routes\/(_shell\/)?profile(\/index)?\.tsx$/,
  /\/client\/src\/routes\/\(app\)\/profile\/\+(page|layout)\.svelte$/,
  /\/client\/src\/lib\/components\/azuos-account-view\//,
  /\/client\/src\/lib\/hooks\/ui\/use-mobile\.ts$/,
  /\/client\/src\/lib\/motion\/(use-)?sliding-indicator[^/]*$/,
  /^\.claude\/hooks\/protect-app-shell[^/]*$/,
  /^\.claude\/skills\/app-shell-standard\//,
  /^\.claude\/settings(\.local)?\.json$/,
];

/** Pastas de componente que seriam uma SEGUNDA casca. */
const RIVAL_FOLDER = /\/client\/src\/.*\/azuos-[a-z0-9-]*(shell|sidebar|side-nav|nav-rail|bottom-nav|bottom-bar|tab-bar|navbar|profile-view|profile-card)[a-z0-9-]*\//;

/** Marcas de uma barra/menu desenhado fora da casca. */
const RIVAL_MARKUP = [
  { pattern: /components\/ui\/sidebar['"/]/, what: 'importar o `ui/sidebar` fora da casca' },
  { pattern: /<Sidebar(Provider|Inset|Trigger|Rail|Header|Footer|Content)?[\s>/]/, what: 'desenhar `<Sidebar…>` fora da casca' },
  { pattern: /\buseSidebar\s*\(/, what: 'controlar a barra (`useSidebar`) fora da casca' },
  { pattern: /\bcollapsible\s*=/, what: 'criar uma barra recolhível (`collapsible=`)' },
  { pattern: /<nav\b[^>]*\bfixed\b[^>]*\bbottom-0\b/s, what: 'criar uma barra de navegação fixa embaixo' },
  { pattern: /<nav\b[^>]*\bbottom-0\b[^>]*\bfixed\b/s, what: 'criar uma barra de navegação fixa embaixo' },
];

const SOURCE = /\/client\/src\/.*\.(tsx?|svelte)$/;

/* REGRAS DE UI DO GRUPO (13 sistemas), na hora da edição — a checagem de design reprova de novo
   no CI. Cor de card vem do FUNDO (`AzuosToneCard`): borda/anel colorido é proibido em qualquer
   componente; fica só o anel de FOCO. E nunca `<select>` nativo. */
const UI_TONE =
  '(?:primary|destructive|success|warning|info|accent|brand-[a-z]+-\\d{2,3}|azuos-(?!border\\b)[a-z-]+|tone-[a-z]+-border|(?:red|rose|green|emerald|blue|sky|amber|yellow|orange|lime|teal|cyan|indigo|violet|purple|fuchsia|pink)-\\d{2,3})';
const UI_COLORED_BORDER = new RegExp(
  `(?<![\\w-])((?:[\\w\\-\\[\\]=&*>~./]+:)*)!?(border(?:-[xytrblse])?|ring)-(${UI_TONE}|ring)(?:\\/\\d+)?(?![\\w-])`,
  'g',
);
const UI_COMMENT = /^\s*(?:\*|\/\/|\/\*|<!--)/;

/** O anel de FOCO fica (acessibilidade); borda de foco, não. `null` quando a classe pode. */
function borderOffense([whole, variants, kind, color]) {
  const isFocus = /focus|has-focus|has-\[/.test(variants);
  if (kind === 'ring') return isFocus ? null : whole;

  return color === 'ring' && !isFocus ? null : whole;
}

function lineBorderOffense(line) {
  if (UI_COMMENT.test(line) || line.includes('animate-spin')) return null;

  return [...line.matchAll(UI_COLORED_BORDER)].map(borderOffense).find(Boolean) ?? null;
}

/** A primeira borda colorida (ou anel fora do foco) num texto novo; `null` se não houver. */
export function coloredBorderIn(text) {
  return text.split('\n').map(lineBorderOffense).find(Boolean) ?? null;
}

/** `<select>` nativo (fora de comentário) num texto novo. */
export function nativeSelectIn(text) {
  return text.split('\n').some((line) => !UI_COMMENT.test(line) && /<select[\s>]/.test(line));
}

const UI_HELP =
  'Regra do grupo, igual nos 13 sistemas (skill `app-shell-standard`): card colorido usa o FUNDO ' +
  '(`AzuosToneCard`: `static` só colorido, `interactive` com o hover-fill do Chamados); borda, faixa ' +
  'ou anel colorido é proibido em qualquer componente (só o anel de foco fica). Select é sempre o ' +
  'combobox do projeto, nunca o `<select>` nativo. Pedido de exceção vai para o suporte: ' +
  'https://chamados.grupoazuos.com.br/support.';
const ROOT_LAYOUT = /\/client\/src\/routes\/(__root|_shell)\.tsx$|\/client\/src\/routes\/.*\+layout\.svelte$/;
const NAVIGATION_FILE = /\/client\/src\/lib\/navigation\/navigation\.ts$/;

/** Trechos de caminho da casca, para reconhecer um comando de terminal que mexe nela. */
const PROTECTED_FRAGMENTS = [
  'azuos-app-shell',
  'azuos-zuzu',
  'azuos-brand-mark',
  'azuos-sidebar-controls',
  'components/ui/sidebar',
  'components/ui/sheet',
  'components/ui/tooltip',
  'app-shell-navigation',
  'use-account-session.model',
  'account-session.api',
  'azuos-my-profile-view',
  'azuos-tone-card',
  'azuos-stat-card',
  'azuos-calendar-dropdown',
  'use-my-profile',
  'account-profile.api',
  'azuos-account-view',
  'routes/profile',
  '_shell/profile',
  '(app)/profile/+',
  'hooks/ui/use-mobile',
  'sliding-indicator',
  'protect-app-shell',
  'app-shell-standard',
  '.claude/settings',
];

/* Verbos que ESCREVEM. Redirecionar para `/dev/null` ou juntar saídas (`2>&1`) não escreve. */
const MUTATING =
  /(\brm\b|\bmv\b|\bcp\b|\bln\b|\btee\b|\btruncate\b|\bdd\b|\bpatch\b|\bsed\b[^|;&]*\s-i|\bperl\b[^|;&]*\s-[a-z]*i|(^|[^0-9&>])>{1,2}(?!\s*(\/dev\/null|&))|\bgit\s+(checkout|restore|rm|mv|apply|stash|reset|clean)\b|\bnode\b\s+-e|\bpython3?\b|--write\b)/;
const ADMIN_ON = /\bgit\s+config\b(?![^|;&]*--(get|unset|list))[^|;&]*\b(azuos|project)\.admin\b\s+["']?(true|1|yes|on)\b/;
const NO_VERIFY = /\bgit\s+(commit|push|merge|rebase)\b[^|;&]*--no-verify\b/;

const HELP =
  'O app-shell e a tela "Meu perfil" são o padrão do Grupo Azuos, IGUAIS nos 13 sistemas ' +
  '(skill `app-shell-standard`). Quem usa NÃO muda essas telas: o pedido vai para o SUPORTE — ' +
  'abra um chamado na Central de Chamados (https://chamados.grupoazuos.com.br/support). ' +
  'Telas, partes e atalhos do menu mudam em `lib/navigation/navigation.ts`, só com dados. ' +
  'Só quem administra muda a forma, nos 13 de uma vez, no próprio terminal: `git config azuos.admin true`.';

function isAdmin(root) {
  return ADMIN_KEYS.some((key) => {
    try {
      return (
        execFileSync('git', ['config', '--get', key], {
          cwd: root,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'],
        }).trim() === 'true'
      );
    } catch (error) {
      if (error.status === 1 || error.status === 128) return false;
      throw error;
    }
  });
}

/** Caminho relativo à raiz do repo, sempre com `/` — e com `/` na frente para os padrões. */
function repoPath(root, file) {
  const absolute = isAbsolute(file) ? file : resolve(root, file);
  const rel = relative(root, absolute).split('\\').join('/');

  return rel;
}

function isProtected(rel) {
  return PROTECTED.some((pattern) => pattern.test(rel) || pattern.test(`/${rel}`));
}

function editedFiles(input) {
  const paths = [
    input.file_path,
    input.notebook_path,
    ...(input.edits ?? []).map((edit) => edit.file_path),
  ];

  return [...new Set(paths.filter((path) => typeof path === 'string' && path.length > 0))];
}

/** O texto NOVO que a edição põe no arquivo. */
function newTexts(input) {
  return [
    input.content,
    input.new_string,
    input.new_source,
    ...(input.edits ?? []).map((edit) => edit.new_string),
  ].filter((text) => typeof text === 'string');
}

function oldTexts(input) {
  return [input.old_string, ...(input.edits ?? []).map((edit) => edit.old_string)].filter(
    (text) => typeof text === 'string',
  );
}

function currentContent(root, rel) {
  const absolute = resolve(root, rel);
  if (!existsSync(absolute)) return '';

  return readFileSync(absolute, 'utf8');
}

/**
 * A edição TIRA do arquivo algo que estava lá? Escrita inteira compara com o arquivo atual;
 * troca de trecho compara o trecho velho com o novo.
 */
function drops(root, rel, input, marker) {
  const added = newTexts(input).join('\n');
  if (marker.test(added)) return false;
  if (typeof input.content === 'string') return marker.test(currentContent(root, rel));

  return oldTexts(input).some((text) => marker.test(text));
}

/** O motivo de bloqueio pelo CONTEÚDO novo de um arquivo de tela; `null` para seguir. */
function contentReason(rel, added) {
  const rival = RIVAL_MARKUP.find(({ pattern }) => pattern.test(added));
  if (rival) return `Bloqueado em \`${rel}\`: ${rival.what}. ${HELP}`;

  const border = coloredBorderIn(added);
  if (border) return `Bloqueado em \`${rel}\`: borda colorida \`${border}\`. ${UI_HELP}`;
  if (nativeSelectIn(added)) return `Bloqueado em \`${rel}\`: \`<select>\` nativo. ${UI_HELP}`;

  return null;
}

/** O menu é só DADOS, e o `NAVIGATION` é o contrato dele. */
function navigationReason(root, rel, input, added) {
  if (!NAVIGATION_FILE.test(`/${rel}`)) return null;
  if (drops(root, rel, input, /export const NAVIGATION\b/))
    return `Bloqueado em \`${rel}\`: o \`NAVIGATION\` é o contrato do menu. ${HELP}`;
  if (/from ['"][^'"]*components\//.test(added))
    return `Bloqueado em \`${rel}\`: o menu é só DADOS — nada de componente aqui. ${HELP}`;

  return null;
}

function fileReason(root, input, rel) {
  if (isProtected(rel)) return `\`${rel}\` é da casca padrão e não se edita. ${HELP}`;
  if (RIVAL_FOLDER.test(`/${rel}`)) return `\`${rel}\` seria uma segunda casca/menu. ${HELP}`;
  if (!SOURCE.test(`/${rel}`)) return null;

  const added = newTexts(input).join('\n');
  const byContent = contentReason(rel, added);
  if (byContent) return byContent;

  if (ROOT_LAYOUT.test(`/${rel}`) && drops(root, rel, input, /<(Azuos)?AppShell\b/))
    return `Bloqueado em \`${rel}\`: tirar a casca padrão da rota. ${HELP}`;

  return navigationReason(root, rel, input, added);
}

/** @returns {string | null} o motivo do bloqueio, ou `null` para seguir. */
export function checkEdit(root, input) {
  return (
    editedFiles(input)
      .map((file) => fileReason(root, input, repoPath(root, file)))
      .find(Boolean) ?? null
  );
}

/** @returns {string | null} */
export function checkCommand(command) {
  if (ADMIN_ON.test(command))
    return 'O modo admin só é ligado por quem administra, no próprio terminal — nunca pelo Claude.';
  if (NO_VERIFY.test(command))
    return 'Pular os hooks do git (`--no-verify`) desliga as travas do projeto. Não é permitido.';
  if (!MUTATING.test(command)) return null;

  const touched = PROTECTED_FRAGMENTS.find((fragment) => command.includes(fragment));
  if (touched) return `Este comando mexe em arquivo da casca padrão. ${HELP}`;

  return null;
}

export function decide(root, event) {
  const input = event?.tool_input;
  if (!input || typeof input !== 'object') throw new Error('Hook input must include tool_input');
  if (typeof input.command === 'string') return checkCommand(input.command);

  return checkEdit(root, input);
}

function main() {
  const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
  if (isAdmin(root)) return;
  const reason = decide(root, JSON.parse(readFileSync(0, 'utf8')));
  if (!reason) return;
  process.stderr.write(`BLOQUEADO (casca padrão): ${reason}\n`);
  process.exitCode = 2;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    process.stderr.write(
      `Trava da casca padrão indisponível: ${error.message}\nA operação foi bloqueada; acione quem administra.\n`,
    );
    process.exitCode = 2;
  }
}
