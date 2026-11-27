import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  bumpVersion,
  checkTag,
  compareVersions,
  currentVersion,
  parseTag,
  parseVersion,
  setKomodoVersion,
  systemName,
  tagMessage,
  tagMessageProblems,
  tagOf,
  versionsAt,
} from "./release.mjs";

const KOMODO = `[[build]]
name = "homo_app"
[build.config]
builder = "homo"
image_tag = "homo"
labels = """
org.opencontainers.image.source=https://github.com/grupo-azuos/app
azuos.app=app
azuos.environment=homo
"""

[[stack]]
name = "homo_app"
[stack.config]
version = "não é de build"

[[build]]
name = "prod_app"
[build.config]
version = "0.0.1"
auto_increment_version = true
builder = "prod"
labels = """
azuos.app=app
azuos.version=0.0.1
"""
`;

function git(cwd, ...args) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

/* Um repositório de verdade, pequeno, com main e develop e os arquivos que guardam versão. */
function repository() {
  const root = mkdtempSync(join(tmpdir(), "release-test-"));
  const write = (file, content) => {
    mkdirSync(join(root, file, ".."), { recursive: true });
    writeFileSync(join(root, file), content);
  };
  write(
    "package.json",
    '{\n  "name": "app-workspace",\n  "version": "1.0.0"\n}\n',
  );
  write(
    "server/package.json",
    '{\n  "name": "server",\n  "version": "1.0.0"\n}\n',
  );
  write(
    "package-lock.json",
    JSON.stringify(
      {
        name: "app-workspace",
        version: "1.0.0",
        packages: { "": { version: "1.0.0" }, server: { version: "1.0.0" } },
      },
      null,
      2,
    ) + "\n",
  );
  write(".komodo/komodo.toml", KOMODO);
  write(
    "client/index.html",
    "<html><head><title>Gestão RH · Grupo Azuos</title></head></html>",
  );
  write("server/src/main.ts", ".setTitle('Outro')");
  git(root, "init", "-q", "-b", "main");
  git(root, "config", "user.email", "test@example.com");
  git(root, "config", "user.name", "Test");
  git(root, "add", ".");
  git(root, "commit", "-q", "-m", "first");
  git(root, "branch", "develop");

  return {
    root,
    write,
    read: (file) => readFileSync(join(root, file), "utf8"),
    dispose: () => rmSync(root, { recursive: true, force: true }),
  };
}

test("parses versions and tags in the prod/vX.Y.Z standard only", () => {
  // feliz
  assert.equal(parseVersion("1.2.3"), "1.2.3");
  assert.equal(tagOf("1.2.3"), "prod/v1.2.3");
  assert.equal(parseTag("prod/v1.2.3"), "1.2.3");
  // triste
  assert.throws(() => parseTag("v1.2.3"), /fora do padrão prod\/vX\.Y\.Z/);
  assert.throws(() => parseTag("prod/v1.2"), /fora do padrão/);
  assert.throws(() => parseTag("dashboard/v1.2.3"), /fora do padrão/);
  assert.throws(() => parseVersion("v1.2.3"), /fora do padrão X\.Y\.Z/);
  assert.throws(() => parseVersion("01.2.3"), /fora do padrão/);
});

test("compares versions number by number", () => {
  assert.equal(compareVersions("1.10.0", "1.9.9"), 1);
  assert.equal(compareVersions("1.0.0", "1.0.0"), 0);
  assert.equal(compareVersions("0.9.0", "1.0.0"), -1);
});

test("writes the tag message in the group standard", () => {
  // feliz
  assert.equal(
    tagMessage("Gestão RH", "1.2.0", "férias e ponto"),
    "Gestão RH 1.2.0: férias e ponto.\n\nCanal: prod.\n",
  );
  assert.equal(
    tagMessage("Brand", "1.0.0", "Primeira versão de produção."),
    "Brand 1.0.0: Primeira versão de produção.\n\nCanal: prod.\n",
  );
  assert.deepEqual(
    tagMessageProblems(
      "Gestão RH 1.2.0: férias e ponto.\n\nCanal: prod.\n",
      "1.2.0",
    ),
    [],
  );
  // triste
  assert.throws(() => tagMessage("Brand", "1.0.0", "   "), /o que mudou/);
  assert.throws(() => tagMessage("", "1.0.0", "x"), /nome do sistema/);
  assert.match(
    tagMessageProblems("Versão 1.2.0", "1.2.0").join("\n"),
    /primeira linha/,
  );
  assert.match(
    tagMessageProblems("Gestão RH 1.2.0: férias.\nCanal: prod.", "1.2.0").join(
      "\n",
    ),
    /linha em branco/,
  );
  assert.match(
    tagMessageProblems(
      "Gestão RH 1.2.0: férias.\n\nCanal: homo.",
      "1.2.0",
    ).join("\n"),
    /Canal: prod/,
  );
});

test("sets the version, the auto increment and the label in every Komodo build", () => {
  const toml = setKomodoVersion(KOMODO, "1.2.3");
  const blocks = toml
    .split("[[")
    .filter((block) => block.startsWith("build]]"));
  assert.equal(blocks.length, 2);
  for (const block of blocks) {
    assert.match(
      block,
      /\[build\.config\]\nversion = "1\.2\.3"\nauto_increment_version = false\n/,
    );
    assert.equal((block.match(/^version = /gm) ?? []).length, 1);
    assert.equal((block.match(/^azuos\.version=/gm) ?? []).length, 1);
    assert.match(block, /azuos\.version=1\.2\.3\n"""/);
  }
  assert.doesNotMatch(toml, /azuos\.version=0\.0\.1/);
  assert.match(toml, /\[stack\.config\]\nversion = "não é de build"/);
  assert.equal(setKomodoVersion(toml, "1.2.3"), toml);
});

test("bumps the version in every manifest, lock and Komodo build", () => {
  const repo = repository();
  try {
    assert.equal(currentVersion(repo.root), "1.0.0");
    const changed = bumpVersion(repo.root, "1.1.0");
    assert.deepEqual(changed.sort(), [
      ".komodo/komodo.toml",
      "package-lock.json",
      "package.json",
      "server/package.json",
    ]);
    assert.equal(JSON.parse(repo.read("package.json")).version, "1.1.0");
    assert.equal(JSON.parse(repo.read("server/package.json")).version, "1.1.0");
    const lock = JSON.parse(repo.read("package-lock.json"));
    assert.equal(lock.version, "1.1.0");
    assert.equal(lock.packages[""].version, "1.1.0");
    assert.equal(lock.packages.server.version, "1.1.0");
    assert.match(repo.read(".komodo/komodo.toml"), /version = "1\.1\.0"/);
    assert.equal(
      repo.read("package.json"),
      '{\n  "name": "app-workspace",\n  "version": "1.1.0"\n}\n',
    );
    assert.equal(currentVersion(repo.root), "1.1.0");
  } finally {
    repo.dispose();
  }
});

// triste
/* O artefato com versão própria fora da pasta do Build (o agente do chamados) não é tocado. */
test("leaves alone a manifest outside the Komodo build folder", () => {
  const repo = repository();
  try {
    repo.write(".komodo/komodo.toml", `build_path = "server"\n${KOMODO}`);
    repo.write(
      "agent/package.json",
      '{\n  "name": "agent",\n  "version": "9.0.0"\n}\n',
    );
    git(repo.root, "add", ".");
    git(repo.root, "commit", "-q", "-m", "agent");
    assert.equal(currentVersion(repo.root), "1.0.0");
    bumpVersion(repo.root, "1.1.0");
    assert.equal(JSON.parse(repo.read("server/package.json")).version, "1.1.0");
    assert.equal(JSON.parse(repo.read("agent/package.json")).version, "9.0.0");
  } finally {
    repo.dispose();
  }
});

test("reads the system name from the browser title before the API title", () => {
  const repo = repository();
  try {
    assert.equal(systemName(repo.root), "Gestão RH");
    repo.write("client/index.html", "<title>Sem marca</title>");
    git(repo.root, "add", ".");
    assert.equal(systemName(repo.root), "Sem marca");
    git(repo.root, "rm", "-q", "-f", "client/index.html");
    assert.equal(systemName(repo.root), "Outro");
  } finally {
    repo.dispose();
  }
});

test("checks a tag before it leaves the machine", () => {
  const repo = repository();
  try {
    // triste: tag leve, versão dos arquivos diferente, commit fora da main
    git(repo.root, "tag", "prod/v1.1.0");
    const light = git(repo.root, "rev-parse", "prod/v1.1.0");
    assert.match(
      checkTag(repo.root, "prod/v1.1.0", light).join("\n"),
      /precisa ser anotada/,
    );
    git(repo.root, "tag", "-d", "prod/v1.1.0");

    git(repo.root, "switch", "-q", "develop");
    bumpVersion(repo.root, "1.1.0");
    git(
      repo.root,
      "commit",
      "-q",
      "-a",
      "-m",
      "[chore](release): Versão 1.1.0",
    );
    git(
      repo.root,
      "tag",
      "-a",
      "prod/v1.1.0",
      "-m",
      "Gestão RH 1.1.0: férias.\n\nCanal: prod.",
    );
    const annotated = git(repo.root, "rev-parse", "prod/v1.1.0");
    assert.match(
      checkTag(repo.root, "prod/v1.1.0", annotated).join("\n"),
      /só nasce na main/,
    );
    assert.deepEqual(
      versionsAt(repo.root, "develop").map((entry) => entry.version),
      ["1.1.0", "1.1.0", "1.1.0"],
    );

    git(
      repo.root,
      "tag",
      "-a",
      "-f",
      "prod/v1.2.0",
      "-m",
      "Gestão RH 1.2.0: férias.\n\nCanal: prod.",
    );
    const mismatch = git(repo.root, "rev-parse", "prod/v1.2.0");
    assert.match(
      checkTag(repo.root, "prod/v1.2.0", mismatch).join("\n"),
      /package\.json está em 1\.1\.0, e a tag é 1\.2\.0/,
    );
    assert.match(
      checkTag(repo.root, "v1.2.0", mismatch).join("\n"),
      /fora do padrão prod\/vX\.Y\.Z/,
    );

    // feliz: develop na main por merge, tag anotada no padrão
    git(repo.root, "switch", "-q", "main");
    git(
      repo.root,
      "merge",
      "-q",
      "--no-ff",
      "-m",
      "[merge](release): v1.1.0 na main",
      "develop",
    );
    git(repo.root, "tag", "-d", "prod/v1.1.0");
    git(
      repo.root,
      "tag",
      "-a",
      "prod/v1.1.0",
      "-m",
      "Gestão RH 1.1.0: férias.\n\nCanal: prod.",
    );
    const good = git(repo.root, "rev-parse", "prod/v1.1.0");
    assert.deepEqual(checkTag(repo.root, "prod/v1.1.0", good), []);

    // a main que está sendo enviada no mesmo push também conta
    const merge = git(repo.root, "rev-parse", "main");
    git(repo.root, "switch", "-q", "develop");
    git(repo.root, "update-ref", "refs/heads/main", "main~1");
    assert.match(
      checkTag(repo.root, "prod/v1.1.0", good).join("\n"),
      /só nasce na main/,
    );
    assert.deepEqual(checkTag(repo.root, "prod/v1.1.0", good, merge), []);
  } finally {
    repo.dispose();
  }
});
