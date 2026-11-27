#!/usr/bin/env node
// O PADRÃO DE VERSÃO do Grupo Azuos (.claude/rules/infra.md §6 e skill `release-standard`).
//
// Uma versão nova nasce na develop, vai para a main e vira a tag anotada `prod/vX.Y.Z`, com a
// mesma versão gravada em todo lugar que a guarda: os package.json, os package-lock.json e o Build
// do Komodo (`version` e o label `azuos.version`). Não existe tag sem esses arquivos atualizados:
// o `release-guard.sh` chama o `--check` deste script no pre-push e recusa a tag fora do padrão.
//
//   node scripts/release.mjs 1.2.0 --notes "o que mudou" --trailer "Participant-Id: p-…" …
//   node scripts/release.mjs --check prod/v1.2.0 <sha da tag> [<sha da main enviada>]
//   node scripts/release.mjs --current
//
// Roda só com Node e git, sem `npm ci`. Igual em todos os apps; a base é o template.
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
export const TAG = /^prod\/v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
export const CHANNEL_LINE = "Canal: prod.";

/** `1.2.3`, sem prefixo nem sufixo. */
export function parseVersion(text) {
  if (!VERSION.test(text ?? ""))
    throw new Error(`Versão "${text}" fora do padrão X.Y.Z`);

  return text;
}

/** A tag de produção da versão: `prod/v1.2.3`. */
export function tagOf(version) {
  return `prod/v${parseVersion(version)}`;
}

/** A versão de uma tag `prod/vX.Y.Z`. Qualquer outro formato é recusado. */
export function parseTag(tag) {
  const match = TAG.exec(tag ?? "");
  if (!match) throw new Error(`Tag "${tag}" fora do padrão prod/vX.Y.Z`);

  return match.slice(1).join(".");
}

export function compareVersions(left, right) {
  const a = left.split(".").map(Number);
  const b = right.split(".").map(Number);
  for (let index = 0; index < 3; index++) {
    if (a[index] !== b[index]) return Math.sign(a[index] - b[index]);
  }

  return 0;
}

/**
 * A mensagem da tag: `<Sistema> X.Y.Z: o que mudou.` e, depois de uma linha em branco, o canal.
 * Serve para controle interno: quem lê `git tag -n3` sabe o que entrou em cada versão.
 */
export function tagMessage(system, version, notes) {
  const text = (notes ?? "").trim().replace(/\.+$/, "");
  if (!system?.trim()) throw new Error("Informe o nome do sistema (--system)");
  if (!text) throw new Error("Informe o que mudou nesta versão (--notes)");

  return `${system.trim()} ${parseVersion(version)}: ${text}.\n\n${CHANNEL_LINE}\n`;
}

/** Os problemas de uma mensagem de tag, em português, para a trava do pre-push mostrar. */
export function tagMessageProblems(message, version) {
  const lines = (message ?? "").trimEnd().split("\n");
  const [title = "", blank, ...rest] = lines;
  const problems = [];
  const titlePattern = new RegExp(
    `^\\S.* ${version.replaceAll(".", "\\.")}: .+\\.$`,
  );
  if (!titlePattern.test(title)) {
    problems.push(
      `A primeira linha da tag deve ser "<Sistema> ${version}: o que mudou." (está "${title}")`,
    );
  }
  if (blank !== "" || !rest.includes(CHANNEL_LINE)) {
    problems.push(`A tag termina com uma linha em branco e "${CHANNEL_LINE}"`);
  }

  return problems;
}

function git(cwd, args, input) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    input,
    stdio: ["pipe", "pipe", "pipe"],
  }).trim();
}

/* Comandos que falam com a pessoa (push, commit, merge): a saída e os hooks aparecem no terminal. */
function gitLoud(cwd, args) {
  execFileSync("git", args, { cwd, stdio: "inherit" });
}

function tryGit(cwd, args) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });

  return result.status === 0 ? result.stdout.trim() : undefined;
}

/* Mantém a indentação e a quebra de linha final do arquivo, para o diff mostrar só a versão. */
function updateJson(path, change) {
  const original = readFileSync(path, "utf8");
  const data = JSON.parse(original);
  change(data);
  const indent = original.match(/\n(\s+)"/)?.[1] ?? "  ";
  writeFileSync(
    path,
    JSON.stringify(data, null, indent) + (original.endsWith("\n") ? "\n" : ""),
  );
}

function trackedFiles(root, name) {
  return git(root, ["ls-files", `*${name}`, name])
    .split("\n")
    .filter((file) => file && (file === name || file.endsWith(`/${name}`)));
}

/**
 * Os arquivos da versão do SISTEMA: os da raiz e os que moram na pasta de um Build do Komodo. Um
 * artefato com versão e tag próprias fora dela (o agente Windows do chamados, em `chamados/agent`,
 * com a tag `agent/v`) não anda junto com a tag `prod/v`.
 */
function versionFiles(root, name) {
  const buildPaths = trackedFiles(root, "komodo.toml").flatMap((toml) =>
    [
      ...readFileSync(join(root, toml), "utf8").matchAll(
        /^build_path = "([^"]+)"/gm,
      ),
    ].map((match) => match[1]),
  );
  const files = trackedFiles(root, name);
  if (buildPaths.length === 0 || buildPaths.includes(".")) return files;

  return files.filter(
    (file) =>
      dirname(file) === "." ||
      buildPaths.some((path) => file.startsWith(`${path}/`)),
  );
}

/**
 * Em cada `[build.config]` do Komodo: `version` igual à tag, `auto_increment_version = false`
 * (sem isso o Komodo soma 1 no patch a cada build e a versão dele descola da tag) e o label
 * `azuos.version` na imagem, para o `docker image inspect` dizer qual versão está rodando.
 */
export function setKomodoVersion(toml, version) {
  return toml.replace(
    /^\[build\.config\]\n((?:(?!\[).*\n?)*)/gm,
    (_block, body) => {
      const rest = body
        .split("\n")
        .filter((line) => !/^(version|auto_increment_version)\s*=/.test(line))
        .join("\n")
        .replace(/labels = """\n([\s\S]*?)"""/, (_labels, lines) => {
          const kept = lines
            .split("\n")
            .filter((line) => line && !line.startsWith("azuos.version="));

          return `labels = """\n${[...kept, `azuos.version=${version}`].join("\n")}\n"""`;
        });

      return `[build.config]\nversion = "${version}"\nauto_increment_version = false\n${rest}`;
    },
  );
}

/** O maior `version` entre os package.json do repositório: a versão em que a branch está. */
export function currentVersion(root) {
  return versionFiles(root, "package.json")
    .map(
      (file) =>
        JSON.parse(readFileSync(join(root, file), "utf8")).version ?? "0.0.0",
    )
    .reduce(
      (highest, version) =>
        compareVersions(version, highest) > 0 ? version : highest,
      "0.0.0",
    );
}

/** Grava a versão em todos os arquivos e devolve os que mudaram. */
export function bumpVersion(root, version) {
  const manifests = versionFiles(root, "package.json");
  for (const file of manifests) {
    updateJson(join(root, file), (data) => {
      data.version = version;
    });
  }

  /* No lock, a raiz e cada workspace (pela pasta do package.json dele) levam a versão nova. */
  for (const lock of versionFiles(root, "package-lock.json")) {
    const lockDir = dirname(lock);
    const workspaces = manifests
      .map((file) => relative(lockDir, dirname(file)).replaceAll("\\", "/"))
      .filter((dir) => dir !== "" && !dir.startsWith(".."));
    updateJson(join(root, lock), (data) => {
      data.version = version;
      if (data.packages?.[""]) data.packages[""].version = version;
      for (const dir of workspaces) {
        if (data.packages?.[dir]) data.packages[dir].version = version;
      }
    });
  }

  for (const toml of trackedFiles(root, "komodo.toml")) {
    const path = join(root, toml);
    writeFileSync(path, setKomodoVersion(readFileSync(path, "utf8"), version));
  }

  return git(root, ["diff", "--name-only"]).split("\n").filter(Boolean);
}

/**
 * O nome do sistema como as pessoas o veem (skill `rename-project`): o título da aba do navegador,
 * senão o título da documentação da API, senão o nome do repositório.
 */
export function systemName(root) {
  const read = (file) => readFileSync(join(root, file), "utf8");
  for (const file of trackedFiles(root, "index.html").concat(
    trackedFiles(root, "app.html"),
  )) {
    const title = /<title>([^<·]+?)(?:\s*·\s*Grupo Azuos)?<\/title>/
      .exec(read(file))?.[1]
      ?.trim();
    if (title) return title;
  }
  for (const file of trackedFiles(root, "main.ts")) {
    const title = /\.setTitle\(\s*['"]([^'"]+)['"]\s*\)/
      .exec(read(file))?.[1]
      ?.trim();
    if (title) return title;
  }
  const remote =
    tryGit(root, ["remote", "get-url", "origin"]) ?? basename(root);

  return basename(remote).replace(/\.git$/, "");
}

/** Os arquivos que guardam versão num commit, e a versão em cada um. */
export function versionsAt(root, commit) {
  const files = git(root, ["ls-tree", "-r", "--name-only", commit])
    .split("\n")
    .filter(
      (file) =>
        /(^|\/)(package\.json|komodo\.toml)$/.test(file) &&
        !file.includes("node_modules/"),
    );

  return files.map((file) => {
    const content = git(root, ["show", `${commit}:${file}`]);
    if (file.endsWith("komodo.toml")) {
      /* Só os Builds guardam versão; a mesma tem que estar no `version` e no label de todos. */
      const builds = [
        ...content.matchAll(/^\[build\.config\]\n((?:(?!\[).*\n?)*)/gm),
      ].map((match) => match[1]);
      const found = new Set(
        builds.flatMap((build) => [
          /^version = "([^"]+)"/m.exec(build)?.[1],
          /^azuos\.version=(.+)$/m.exec(build)?.[1],
        ]),
      );

      return { file, version: found.size === 1 ? [...found][0] : undefined };
    }

    return { file, version: JSON.parse(content).version };
  });
}

/**
 * O que a trava do pre-push confere numa tag `prod/vX.Y.Z` antes de ela sair da máquina:
 * anotada, mensagem no padrão, versão igual em todos os arquivos do commit e commit na main.
 */
export function checkTag(root, tag, sha, pushedMain) {
  let version;
  try {
    version = parseTag(tag);
  } catch (error) {
    return [error.message];
  }
  if (tryGit(root, ["cat-file", "-t", sha]) !== "tag") {
    return [
      `A tag ${tag} precisa ser anotada (git tag -a), com a mensagem no padrão`,
    ];
  }
  const problems = [];
  const message = git(root, ["cat-file", "tag", sha])
    .split("\n\n")
    .slice(1)
    .join("\n\n");
  problems.push(...tagMessageProblems(message, version));

  const commit = git(root, ["rev-parse", `${sha}^{commit}`]);
  for (const entry of versionsAt(root, commit)) {
    if (entry.version !== version) {
      problems.push(
        `${entry.file} está em ${entry.version ?? "versão nenhuma"}, e a tag é ${version}`,
      );
    }
  }

  const mains = [
    pushedMain,
    "refs/heads/main",
    "refs/remotes/origin/main",
  ].filter(Boolean);
  const onMain = mains.some(
    (ref) =>
      spawnSync("git", ["merge-base", "--is-ancestor", commit, ref], {
        cwd: root,
      }).status === 0,
  );
  if (!onMain)
    problems.push(
      `A tag ${tag} só nasce na main: o commit ${commit.slice(0, 7)} não está nela`,
    );

  return problems;
}

function parseArguments(args) {
  const options = { trailers: [] };
  const positional = [];
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === "--check" || arg === "--current") options.mode = arg;
    else if (arg === "--notes") options.notes = args[++index];
    else if (arg === "--system") options.system = args[++index];
    else if (arg === "--trailer") options.trailers.push(args[++index]);
    else positional.push(arg);
  }

  return { ...options, positional };
}

function messageFile(root, title, trailers) {
  const file = join(
    mkdtempSync(join(tmpdir(), "azuos-release-")),
    "message.txt",
  );
  writeFileSync(file, `${title}\n\n${trailers.join("\n")}\n`);

  return file;
}

/* A develop desta máquina tem que ser a develop de todos: nada por enviar, nada por receber. */
function ensureDevelopIsCurrent(root) {
  if (git(root, ["symbolic-ref", "--quiet", "--short", "HEAD"]) !== "develop") {
    throw new Error(
      "A versão nova nasce na develop: troque para ela (git switch develop)",
    );
  }
  if (git(root, ["status", "--porcelain"])) {
    throw new Error(
      "Há alterações sem commit; a versão só sobe com a árvore limpa",
    );
  }
  gitLoud(root, ["fetch", "--quiet", "origin", "develop", "main"]);
  if (
    git(root, ["rev-parse", "develop"]) !==
    git(root, ["rev-parse", "origin/develop"])
  ) {
    throw new Error(
      "A develop local e a origin/develop estão diferentes; alinhe as duas antes",
    );
  }
}

/* A main nunca é tocada na pasta de trabalho: entra num worktree temporário, com a branch nela. */
function withMainWorktree(root, work) {
  if (
    tryGit(root, ["rev-parse", "--verify", "--quiet", "refs/heads/main"]) ===
    undefined
  ) {
    git(root, ["branch", "main", "origin/main"]);
  }
  const checkedOut = git(root, ["worktree", "list", "--porcelain"]).includes(
    "\nbranch refs/heads/main",
  );
  if (checkedOut)
    throw new Error(
      "A main está aberta em outro worktree desta máquina; feche-o antes",
    );
  /* A main desta máquina segue a origin/main; um commit só daqui seria perdido, então para antes. */
  if (
    spawnSync("git", ["merge-base", "--is-ancestor", "main", "origin/main"], {
      cwd: root,
    }).status !== 0
  ) {
    throw new Error(
      "A main local tem commits que não estão na origin/main; resolva isso antes",
    );
  }
  git(root, ["update-ref", "refs/heads/main", "origin/main"]);
  const checkout = join(mkdtempSync(join(tmpdir(), "azuos-release-")), "main");
  git(root, ["worktree", "add", "--quiet", checkout, "main"]);
  try {
    work(checkout);
  } finally {
    git(root, ["worktree", "remove", "--force", checkout]);
    rmSync(dirname(checkout), { recursive: true, force: true });
  }
}

/**
 * O lançamento inteiro: versão nos arquivos e commit na develop, develop na main por merge
 * `--no-ff`, tag anotada na main, e o envio de develop, main e tag.
 */
export function release(root, { version, notes, system, trailers }) {
  parseVersion(version);
  if (git(root, ["config", "--get", "azuos.admin"]) !== "true") {
    throw new Error(
      "Lançar versão é de quem administra o projeto (git config azuos.admin true)",
    );
  }
  if (!trailers.some((trailer) => trailer.startsWith("Participant-Id:"))) {
    throw new Error(
      'Informe os trailers de identificação (--trailer "Participant-Id: …"), skill participant-identity',
    );
  }
  const tag = tagOf(version);
  const message = tagMessage(system ?? systemName(root), version, notes);
  ensureDevelopIsCurrent(root);
  const current = currentVersion(root);
  if (compareVersions(version, current) <= 0) {
    throw new Error(
      `A versão nova (${version}) precisa ser maior que a atual (${current})`,
    );
  }
  if (
    tryGit(root, ["rev-parse", "--verify", "--quiet", `refs/tags/${tag}`]) !==
    undefined
  ) {
    throw new Error(`A tag ${tag} já existe`);
  }

  const changed = bumpVersion(root, version);
  if (changed.length === 0)
    throw new Error("Nenhum arquivo guarda versão neste repositório");
  gitLoud(root, ["add", "--", ...changed]);
  gitLoud(root, [
    "commit",
    "--quiet",
    "-F",
    messageFile(root, `[chore](release): Versão ${version}`, trailers),
  ]);
  gitLoud(root, ["push", "origin", "develop"]);

  withMainWorktree(root, (main) => {
    gitLoud(main, [
      "merge",
      "--no-ff",
      "--quiet",
      "-F",
      messageFile(root, `[merge](release): v${version} na main`, trailers),
      "develop",
    ]);
    const tagFile = join(
      mkdtempSync(join(tmpdir(), "azuos-release-")),
      "tag.txt",
    );
    writeFileSync(tagFile, message);
    gitLoud(main, ["tag", "-a", tag, "-F", tagFile]);
    gitLoud(main, ["push", "origin", "main", tag]);
  });

  return { version, tag, changed, message };
}

function main() {
  const { mode, positional, ...options } = parseArguments(
    process.argv.slice(2),
  );
  const root = git(process.cwd(), ["rev-parse", "--show-toplevel"]);
  if (mode === "--current") {
    console.log(currentVersion(root));

    return;
  }
  if (mode === "--check") {
    const [tag, sha, pushedMain] = positional;
    const problems = checkTag(root, tag, sha, pushedMain);
    if (problems.length === 0) return;
    console.error(problems.map((problem) => `  ✋ ${problem}`).join("\n"));
    process.exitCode = 1;

    return;
  }
  const result = release(root, { version: positional[0], ...options });
  console.log(`\n${result.tag} enviada: ${result.message.split("\n")[0]}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    main();
  } catch (error) {
    console.error(`\n  ✋ ${error.message}\n`);
    process.exitCode = 1;
  }
}
