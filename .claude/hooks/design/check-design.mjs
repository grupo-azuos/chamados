/**
 * Verificador unificado de Design, Arquitetura e Leis de UX.
 *
 * Três modos:
 *   node .claude/hooks/design/check-design.mjs            varre o projeto (CI, pre-push)
 *   node .claude/hooks/design/check-design.mjs --hook     hook PostToolUse do Claude Code
 *   node .claude/hooks/design/check-design.mjs --summary  hook SessionStart: regras no contexto
 *   node .claude/hooks/design/check-design.mjs --update   atualiza a baseline de arquitetura
 *
 * Coexiste duas camadas complementares:
 * 1. Arquitetura do Template: componentes irmãos (.stories, .test), boundaries, rotas, convenções de pasta.
 * 2. Marca e Leis de UX: tokens sem cor crua, sem preto/branco puro, padrão Cupertino, Fitts, Hick, Jakob, etc.
 *
 * Sem dependências externas. JavaScript puro (.mjs) para Node 22+.
 */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { checkSource, formatViolations, isInScope, summarize } from "./design-rules.mjs";
import { RULES as ARCH_RULES, compareWithBaseline, countByKey } from "./architecture-rules.mjs";
import { collectDocumentation, collectTextFiles } from "./project-files.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..", "..");
const BASELINE_FILE = join(HERE, "design-baseline.json");
const EXIT_BLOCK = 2;

const result = (code, stdout = "", stderr = "") => ({
	code,
	stdout,
	stderr
});

/** Lê a config: `--config <arquivo>` ou o `design.config.json` ao lado deste script. */
export function loadConfig(argv = process.argv) {
	const flag = argv.indexOf("--config");
	const path = flag > -1 ? resolve(argv[flag + 1]) : join(HERE, "design.config.json");
	return JSON.parse(readFileSync(path, "utf8"));
}

function* walk(dir) {
	let entries;
	try {
		entries = readdirSync(dir);
	} catch {
		return;
	}
	for (const name of entries) {
		if (name === "node_modules" || name.startsWith(".")) continue;
		const full = join(dir, name);
		if (statSync(full).isDirectory()) {
			yield* walk(full);
			continue;
		}
		yield full;
	}
}

/**
 * Modo hook (PostToolUse): confere só o arquivo que a ferramenta acabou de editar.
 */
export function runHook(payload, config, root) {
	const target = payload.tool_input?.file_path ?? payload.tool_input?.path;
	if (!target) return result(0);
	const path = relative(root, resolve(root, target));
	if (path.startsWith("..") || !isInScope(path, config)) return result(0);
	let content;
	try {
		content = readFileSync(resolve(root, path), "utf8");
	} catch {
		return result(0);
	}
	const violations = checkSource(path, content, config);
	const errors = violations.filter((v) => v.severity === "error");
	const warnings = violations.filter((v) => v.severity === "warning");
	if (errors.length) {
		return result(EXIT_BLOCK, "", `O arquivo editado viola o design de "${config.brand}". Corrija antes de seguir:\n\n${formatViolations(path, violations)}\n`);
	}
	if (warnings.length) {
		const additionalContext = `Avisos de design em ${path} (corrija se fizer sentido):\n${formatViolations(path, warnings)}`;
		return result(0, JSON.stringify({ hookSpecificOutput: {
			hookEventName: "PostToolUse",
			additionalContext
		} }));
	}
	return result(0);
}

/** Executa a verificação arquitetural do repositório (com baseline). */
export function runArchitectureScan(root, updateBaseline = false) {
	const baseline = existsSync(BASELINE_FILE) ? JSON.parse(readFileSync(BASELINE_FILE, "utf8")) : {};
	const scanRoots = ["chamados/dashboard/client/src"];
	const textFile = /\.(tsx|ts|md)$/;
	const generated = /routeTree\.gen\.ts$/;
	const accepts = (p) => textFile.test(p) && !generated.test(p);

	const covered = new Set(scanRoots.map((p) => join(root, p)));
	const sourceFiles = [...covered].flatMap((p) => collectTextFiles(p, accepts));
	const docs = collectDocumentation(join(root, "template"), covered, accepts);
	const rootDocs = collectTextFiles(join(root, "docs"), accepts);

	const files = [...new Set([...sourceFiles, ...docs, ...rootDocs])].map((full) => ({
		path: relative(root, full).split("\\").join("/"),
		content: readFileSync(full, "utf8")
	}));

	const violations = ARCH_RULES.flatMap((rule) => rule.check(files));
	const { added, fixed } = compareWithBaseline(violations, baseline);

	if (updateBaseline) {
		if (added.length > 0) {
			throw new Error("Não é permitido aumentar a baseline; corrija as novas violações primeiro.");
		}
		const counts = countByKey(violations);
		const sorted = Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
		writeFileSync(BASELINE_FILE, `${JSON.stringify(sorted, null, 2)}\n`);
	}

	return {
		violations,
		added,
		fixed,
		totalFiles: files.length,
		baselineCount: Object.keys(baseline).length
	};
}

function scanOneDirectory(dir, config, root) {
	const report = [];
	for (const full of walk(resolve(root, dir))) {
		const path = relative(root, full);
		if (!isInScope(path, config)) continue;
		const violations = checkSource(path, readFileSync(full, "utf8"), config);
		if (violations.length) report.push({ path, violations });
	}
	return report;
}

function scanDirectories(dirs, config, root) {
	return dirs.flatMap((dir) => scanOneDirectory(dir, config, root));
}

function formatArchText(archReport) {
	if (!archReport) return "";
	if (archReport.added.length === 0) {
		const base = `✓ Arquitetura: nenhuma violação nova (${archReport.baselineCount} conhecida(s) na baseline).\n`;
		const fixed = archReport.fixed.length > 0
			? `  Dívida resolvida em ${archReport.fixed.length} item(ns). Rode com --update para atualizar a baseline.\n`
			: "";
		return base + fixed;
	}
	const lines = archReport.added.map((v) => {
		const where = v.line ? `${v.file}:${v.line}` : v.file;
		return `    ${where}  ${v.detail} [${v.rule}]`;
	});
	return `\n✗ Arquitetura: ${archReport.added.length} violação(ões) nova(s):\n${lines.join("\n")}\n`;
}

/** Modo varredura (CI, pre-push): varre pastas da config + checagem arquitetural. */
export function runScan(config, root, json = false, updateBaseline = false) {
	const report = scanDirectories(config.scan.dirs, config, root);
	const all = report.flatMap((r) => r.violations);
	const uxErrors = all.filter((v) => v.severity === "error").length;

	let archReport = null;
	const isTemplateWorkspace = existsSync(join(root, "chamados/dashboard/client/src"));
	if (isTemplateWorkspace) {
		try {
			archReport = runArchitectureScan(root, updateBaseline);
		} catch (err) {
			return result(1, "", err.message + "\n");
		}
	}

	const details = json
		? JSON.stringify(report, null, 2) + "\n"
		: report.map(({ path, violations }) => formatViolations(path, violations) + "\n\n").join("");

	const total = `Design & Leis de UX: ${uxErrors} erro(s), ${all.length - uxErrors} aviso(s) em ${report.length} arquivo(s).\n`;
	const archText = formatArchText(archReport);
	const hasError = uxErrors > 0 || (archReport && archReport.added.length > 0);
	return result(hasError ? 1 : 0, details + total + archText);
}

/** Escolhe o modo pelos argumentos. `stdin` só é lido no modo hook. */
export async function run(argv, readStdin, root) {
	const config = loadConfig(argv);
	if (argv.includes("--summary")) return result(0, summarize(config) + "\n");
	if (argv.includes("--hook")) {
		const payload = JSON.parse(await readStdin() || "{}");
		return runHook(payload, config, process.env.CLAUDE_PROJECT_DIR ?? payload.cwd ?? root);
	}
	const update = argv.includes("--update");
	return runScan(config, process.env.CLAUDE_PROJECT_DIR ?? root, argv.includes("--json"), update);
}

function readProcessStdin() {
	return new Promise((done) => {
		let data = "";
		process.stdin.setEncoding("utf8");
		process.stdin.on("data", (chunk) => data += chunk);
		process.stdin.on("end", () => done(data));
	});
}

/* Executado direto (`node check-design.mjs`), não importado por um teste. */
const isEntryPoint = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isEntryPoint) {
	const defaultRoot = process.env.CLAUDE_PROJECT_DIR ?? REPO_ROOT;
	const { code, stdout, stderr } = await run(process.argv, readProcessStdin, defaultRoot);
	process.stdout.write(stdout);
	process.stderr.write(stderr);
	process.exitCode = code;
}
