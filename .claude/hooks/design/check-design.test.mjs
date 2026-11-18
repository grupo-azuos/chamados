/**
 * Testes do verificador (o script que os hooks chamam). Rodam com o test runner do Node, sem
 * dependência: node --test ".claude/hooks/design/*.test.mjs"
 * Cada teste monta um projeto temporário de verdade.
 */
/**
* Testes do verificador (o script que os hooks chamam). Rodam com o test runner do Node, sem
* dependência: node --test ".claude/hooks/design/*.test.mjs"
* Cada teste monta um projeto temporário de verdade.
*/
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { loadConfig, run, runHook, runScan } from "./check-design.mjs";
const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "check-design.mjs");
const config = {
	brand: "teste",
	skill: "teste-design",
	scan: {
		dirs: ["src"],
		extensions: [".svelte", ".css"],
		tokenFiles: ["tokens.css"],
		ignore: ["node_modules"]
	},
	brandRules: {
		tokensOnly: true,
		noPureBlackWhite: true,
		noArbitraryValues: true
	},
	laws: {
		hick: {
			enabled: true,
			maxNavItems: 7,
			maxSelectOptions: 10
		},
		fitts: {
			enabled: true,
			minTargetPx: 40
		},
		jakob: { enabled: true },
		miller: {
			enabled: true,
			maxUngroupedFields: 7
		},
		vonRestorff: {
			enabled: true,
			maxPrimaryActions: 1
		},
		uniformConnectedness: { enabled: true },
		tesler: { enabled: true }
	}
};
const BAD = "<button type=\"button\" class=\"h-6 bg-black\">Salvar</button>";
const WARN = "<label>E-mail <input name=\"email\" /></label>";
const GOOD = "<button type=\"button\" class=\"h-10 bg-primary text-primary-foreground\">Salvar</button>";
/** Projeto temporário com os arquivos dados (caminho → conteúdo) e a config. */
function project(files) {
	const root = mkdtempSync(join(tmpdir(), "check-design-"));
	for (const [path, content] of Object.entries(files)) {
		mkdirSync(dirname(join(root, path)), { recursive: true });
		writeFileSync(join(root, path), content);
	}
	const configPath = join(root, "design.config.json");
	writeFileSync(configPath, JSON.stringify(config));
	return {
		root,
		configPath
	};
}
const edit = (file) => ({
	tool_name: "Edit",
	tool_input: { file_path: file }
});
describe("runHook", () => {
	it("blocks an edit that breaks an error-level rule", () => {
		const { root } = project({ "src/page.svelte": BAD });
		const out = runHook(edit(join(root, "src/page.svelte")), config, root);
		assert.equal(out.code, 2);
		assert.match(out.stderr, /viola o design de "teste"/);
		assert.match(out.stderr, /brand\/no-pure-black-white/);
		assert.match(out.stderr, /fitts\/target-size/);
	});
	it("passes warnings to the agent as context, without blocking", () => {
		const { root } = project({ "src/form.svelte": WARN });
		const out = runHook(edit("src/form.svelte"), config, root);
		assert.equal(out.code, 0);
		const json = JSON.parse(out.stdout);
		assert.equal(json.hookSpecificOutput.hookEventName, "PostToolUse");
		assert.match(json.hookSpecificOutput.additionalContext, /tesler\/autocomplete/);
	});
	it("stays silent for a clean file", () => {
		const { root } = project({ "src/page.svelte": GOOD });
		assert.deepEqual(runHook(edit("src/page.svelte"), config, root), {
			code: 0,
			stdout: "",
			stderr: ""
		});
	});
	it("ignores payloads without a file, files outside the project or the scope, and deleted files", () => {
		const { root } = project({
			"src/notes.md": BAD,
			"other/page.svelte": BAD
		});
		const silent = {
			code: 0,
			stdout: "",
			stderr: ""
		};
		assert.deepEqual(runHook({}, config, root), silent);
		assert.deepEqual(runHook(edit("/fora/do/projeto.svelte"), config, root), silent);
		assert.deepEqual(runHook(edit("src/notes.md"), config, root), silent);
		assert.deepEqual(runHook(edit("other/page.svelte"), config, root), silent);
		assert.deepEqual(runHook(edit("src/apagado.svelte"), config, root), silent);
	});
	it("accepts the `path` field some tools send instead of `file_path`", () => {
		const { root } = project({ "src/page.svelte": BAD });
		assert.equal(runHook({ tool_input: { path: "src/page.svelte" } }, config, root).code, 2);
	});
});
describe("runScan", () => {
	it("fails with code 1 and lists every file with errors", () => {
		const { root } = project({
			"src/a.svelte": BAD,
			"src/nested/b.svelte": WARN,
			"src/ok.svelte": GOOD
		});
		const out = runScan(config, root);
		assert.equal(out.code, 1);
		assert.match(out.stdout, /src\/a\.svelte:1/);
		assert.match(out.stdout, /src\/nested\/b\.svelte:1/);
		assert.match(out.stdout, /em 2 arquivo\(s\)/);
	});
	it("passes with only warnings and skips node_modules and dot folders", () => {
		const { root } = project({
			"src/b.svelte": WARN,
			"src/node_modules/x.svelte": BAD,
			"src/.cache/y.svelte": BAD
		});
		const out = runScan(config, root);
		assert.equal(out.code, 0);
		assert.match(out.stdout, /0 erro\(s\), 2 aviso\(s\) em 1 arquivo\(s\)/);
	});
	it("prints JSON for tooling", () => {
		const { root } = project({ "src/a.svelte": BAD });
		const out = runScan(config, root, true);
		const report = JSON.parse(out.stdout.slice(0, out.stdout.lastIndexOf("]") + 1));
		assert.equal(report[0].path, "src/a.svelte");
	});
	it("handles a missing scan folder", () => {
		const { root } = project({});
		assert.equal(runScan(config, root).code, 0);
	});
});
describe("run (modo pela linha de comando)", () => {
	it("prints the summary for SessionStart", async () => {
		const { root, configPath } = project({});
		const out = await run([
			"--summary",
			"--config",
			configPath
		], async () => "", root);
		assert.equal(out.code, 0);
		assert.match(out.stdout, /teste-design/);
	});
	it("reads the hook payload from stdin", async () => {
		const { root, configPath } = project({ "src/page.svelte": BAD });
		const payload = JSON.stringify({
			cwd: root,
			...edit("src/page.svelte")
		});
		const out = await run([
			"--hook",
			"--config",
			configPath
		], async () => payload, "/");
		assert.equal(out.code, 2);
	});
	it("treats an empty stdin as a payload without file", async () => {
		const { root, configPath } = project({});
		assert.equal((await run([
			"--hook",
			"--config",
			configPath
		], async () => "", root)).code, 0);
	});
	it("scans by default, honoring --json", async () => {
		const { root, configPath } = project({ "src/a.svelte": BAD });
		const out = await run([
			"--json",
			"--config",
			configPath
		], async () => "", root);
		assert.equal(out.code, 1);
		assert.match(out.stdout, /"path": "src\/a\.svelte"/);
	});
	it("loads design.config.json next to the script by default", () => {
		// Este teste roda em dois lugares: no repositório do brand maker (sem config ao lado) e no
		// projeto que instalou o kit (com a config gerada). Nos dois, o padrão é o arquivo vizinho.
		const beside = join(dirname(SCRIPT), "design.config.json");
		if (existsSync(beside)) {
			assert.equal(typeof loadConfig([]).brand, "string");
			return;
		}
		assert.throws(() => loadConfig([]), /design\.config\.json/);
	});
});
describe("executado como script (como o Claude Code chama)", () => {
	it("exits with code 2 and writes the violations to stderr", () => {
		const { root, configPath } = project({ "src/page.svelte": BAD });
		const child = spawnSync(process.execPath, [
			SCRIPT,
			"--hook",
			"--config",
			configPath
		], {
			input: JSON.stringify(edit(join(root, "src/page.svelte"))),
			env: {
				...process.env,
				CLAUDE_PROJECT_DIR: root
			},
			encoding: "utf8"
		});
		assert.equal(child.status, 2);
		assert.match(child.stderr, /brand\/no-pure-black-white/);
	});
});
