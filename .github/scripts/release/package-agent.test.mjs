import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";

const available = ["wixl", "msibuild", "msiinfo", "git"].every(
  (tool) => spawnSync(tool, ["--version"]).error === undefined,
);

test(
  "compiled MSI versions the desktop and rejects the legacy omission",
  { skip: !available },
  () => {
    const root = mkdtempSync(join(tmpdir(), "agent-msi-"));
    const run = (tool, args) =>
      execFileSync(tool, args, { cwd: root, encoding: "utf8", stdio: "pipe" });
    try {
      for (const file of [
        ".github/scripts/release/package-agent.sh",
        ".github/scripts/release/check-msi.mjs",
        ".github/scripts/release/upgrade-fixture.sh",
        "chamados/agent/build/windows/installer/agent.wxs",
        "chamados/agent/build/windows/installer/configure-machine.ps1",
        "chamados/agent/build/windows/installer/install-certificate.ps1",
        "chamados/agent/build/windows/icon.ico",
      ]) {
        mkdirSync(dirname(join(root, file)), { recursive: true });
        cpSync(resolve(file), join(root, file));
      }
      mkdirSync(join(root, "agent-bin"));
      // Apenas estrutura do MSI no Linux; os PE reais e upgrades rodam no Windows.
      for (const file of ["Azuos Agent.exe", "azuos-agent-service.exe"])
        writeFileSync(join(root, "agent-bin", file), `fixture: ${file}`);
      run("git", ["init", "--quiet"]);
      run("bash", [".github/scripts/release/package-agent.sh", "1.0.4"]);
      const msi = join(root, "release/azuos-agent-1.0.4-x64.msi");
      const legacy = join(root, "legacy.msi");
      run("bash", [".github/scripts/release/upgrade-fixture.sh", msi, legacy]);
      assert.match(
        run("msiinfo", ["export", legacy, "Property"]),
        /ProductVersion\t0\.0\.0/,
      );
      const legacyDesktop = run("msiinfo", ["export", legacy, "File"])
        .split(/\r?\n/)
        .find((line) => line.startsWith("AgentExe\t"));
      assert.equal(legacyDesktop.split("\t")[4], "");
      run("msibuild", [
        msi,
        "-q",
        "UPDATE `File` SET `Version` = '' WHERE `File` = 'AgentExe'",
      ]);
      assert.throws(
        () =>
          run(process.execPath, [
            ".github/scripts/release/check-msi.mjs",
            msi,
            "1.0.4",
          ]),
        /AssertionError/,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  },
);
