import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { checkVersion, validateTag } from "./version.mjs";

function fixture() {
  const directory = mkdtempSync(join(tmpdir(), "release-git-"));
  const origin = join(directory, "origin.git"),
    checkout = join(directory, "checkout");
  mkdirSync(checkout);
  const git = (...args) =>
    execFileSync("git", args, {
      cwd: checkout,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  git("init", "--bare", origin);
  git("init", "-b", "main");
  git("config", "user.name", "Release Test");
  git("config", "user.email", "release@example.test");
  git("config", "commit.gpgsign", "false");
  const write = (path, data) => {
    mkdirSync(dirname(join(checkout, path)), { recursive: true });
    writeFileSync(
      join(checkout, path),
      typeof data === "string" ? data : JSON.stringify(data, null, 2) + "\n",
    );
  };
  write("chamados/agent/wails.json", { info: { productVersion: "0.1.0" } });
  write(
    "chamados/agent/src-go/lib/version/version.go",
    'package version\nconst Current = "0.1.0"\n',
  );
  write("chamados/agent/svelte/package.json", { version: "0.1.0" });
  write("chamados/agent/svelte/package-lock.json", {
    version: "0.1.0",
    packages: { "": { version: "0.1.0" } },
  });
  write("unrelated.txt", "keep this content");
  git("add", ".");
  git("commit", "-m", "Initial fixture");
  git("remote", "add", "origin", origin);
  git("push", "-u", "origin", "main");
  git("branch", "develop");
  git("push", "origin", "develop");
  return { directory, checkout, git, write };
}

test("accepts main tag, rejects off-main tag and mismatched checkout", () => {
  const f = fixture();
  try {
    // feliz: a tag aponta para um commit já integrado à main.
    f.git("tag", "agent/v1.2.3");
    assert.equal(validateTag(f.checkout, "agent/v1.2.3").version, "1.2.3");
    // triste: tag de feature não passa como release só porque seu nome está correto.
    f.git("switch", "-c", "feature");
    f.write("feature.txt", "not merged");
    f.git("add", ".");
    f.git("commit", "-m", "Feature");
    f.git("tag", "agent/v1.2.4");
    assert.throws(() => validateTag(f.checkout, "agent/v1.2.4"));
    assert.throws(
      () => validateTag(f.checkout, "agent/v1.2.3"),
      /Checkout must match/,
    );
  } finally {
    rmSync(f.directory, { recursive: true });
  }
});

test("releases only a commit that already carries the tagged version", () => {
  const f = fixture();
  try {
    // feliz: o commit da tag tem a versão nos arquivos
    assert.deepEqual(checkVersion(f.checkout, "agent/v0.1.0"), {
      component: "agent",
      version: "0.1.0",
    });
    // triste: tag sem o commit de versão é recusada
    assert.throws(() => checkVersion(f.checkout, "agent/v1.2.3"), /bump the version files/);
  } finally {
    rmSync(f.directory, { recursive: true });
  }
});
