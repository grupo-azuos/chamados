/**
 * Testes das regras de design. Rodam com o test runner do Node, sem dependência:
 *   node --test ".claude/hooks/design/*.test.mjs"
 * Cada regra tem um caso feliz (código certo passa) e um triste (o erro comum é pego).
 */
/**
* Testes das regras de design. Rodam com o test runner do Node, sem dependência:
*   node --test ".claude/hooks/design/*.test.mjs"
* Cada regra tem um caso feliz (código certo passa) e um triste (o erro comum é pego).
*/
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkSource, formatViolations, isInScope, summarize } from "./design-rules.mjs";
const config = {
	brand: "teste",
	skill: "teste-design",
	scan: {
		dirs: ["src"],
		extensions: [
			".svelte",
			".tsx",
			".html",
			".css"
		],
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
			maxNavItems: 3,
			maxSelectOptions: 3
		},
		fitts: {
			enabled: true,
			minTargetPx: 40
		},
		jakob: { enabled: true },
		miller: {
			enabled: true,
			maxUngroupedFields: 3
		},
		vonRestorff: {
			enabled: true,
			maxPrimaryActions: 1
		},
		uniformConnectedness: { enabled: true },
		tesler: { enabled: true }
	}
};
const rulesFor = (code, path = "src/x.svelte", cfg = config) => checkSource(path, code, cfg).map((v) => v.rule);
describe("brand/no-pure-black-white", () => {
	it("passes tokens", () => assert.deepEqual(rulesFor("<div class=\"bg-background text-foreground\"></div>"), []));
	it("catches #fff, bg-black and color: white", () => {
		const found = rulesFor("<div class=\"bg-black\"></div>\n<style>.a { color: white; border-color: #fff; }</style>");
		assert.equal(found.filter((r) => r === "brand/no-pure-black-white").length, 3);
	});
	it("applies inside token files too", () => {
		assert.ok(rulesFor(":root { --background: #000000; }", "src/tokens.css").includes("brand/no-pure-black-white"));
	});
});
describe("brand/tokens-only", () => {
	it("allows raw colors in token files", () => assert.deepEqual(rulesFor(":root { --primary: #f2b84b; }", "src/tokens.css"), []));
	it("ignores anchors and html entities", () => assert.deepEqual(rulesFor("<a href=\"#sobre\">Sobre</a> &#123;"), []));
	it("catches hex, rgb and tailwind palette", () => {
		const found = rulesFor("<p class=\"text-blue-500\" style=\"color: #f2b84b; background: rgb(1, 2, 3)\">x</p>");
		assert.equal(found.filter((r) => r === "brand/tokens-only").length, 3);
	});
});
describe("brand/no-arbitrary-values", () => {
	it("allows var() and the scale", () => assert.deepEqual(rulesFor("<div class=\"rounded-[var(--radius)] text-sm\"></div>"), []));
	it("catches arbitrary sizes", () => assert.deepEqual(rulesFor("<div class=\"text-[13px]\"></div>"), ["brand/no-arbitrary-values"]));
});
describe("hick", () => {
	it("passes a short nav", () => assert.deepEqual(rulesFor("<nav><a href=\"/\">A</a><a href=\"/b\">B</a></nav>"), []));
	it("catches a long nav", () => {
		const nav = `<nav>${"<a href=\"/x\">x</a>".repeat(4)}</nav>`;
		assert.deepEqual(rulesFor(nav), ["hick/nav-items"]);
	});
	it("catches a long select but not a grouped one", () => {
		const options = "<option>a</option>".repeat(4);
		assert.deepEqual(rulesFor(`<label>X<select>${options}</select></label>`), ["hick/select-options"]);
		assert.deepEqual(rulesFor(`<label>X<select><optgroup label="g">${options}</optgroup></select></label>`), []);
	});
});
describe("fitts/target-size", () => {
	it("passes h-10 and min-h-10", () => {
		assert.deepEqual(rulesFor("<button type=\"button\" class=\"h-10\">Ok</button>"), []);
		assert.deepEqual(rulesFor("<button type=\"button\" class=\"h-8 min-h-10\">Ok</button>"), []);
	});
	it("catches h-6 buttons and small CSS buttons", () => {
		assert.deepEqual(rulesFor("<button type=\"button\" class=\"h-6\">Ok</button>"), ["fitts/target-size"]);
		assert.deepEqual(rulesFor("<style>.btn { height: 28px; }</style>"), ["fitts/target-size"]);
	});
	it("ignores checkboxes", () => assert.deepEqual(rulesFor("<label><input type=\"checkbox\" class=\"size-4\" /> Aceito</label>"), []));
});
describe("jakob", () => {
	it("passes button and link", () => assert.deepEqual(rulesFor("<button type=\"button\" onclick={go}>Ir</button><a href=\"/x\">X</a>"), []));
	it("catches clickable div and anchor without href", () => {
		assert.deepEqual(rulesFor("<div onclick={go}>Ir</div>"), ["jakob/clickable-non-interactive"]);
		assert.deepEqual(rulesFor("<a onclick={go}>Ir</a>"), ["jakob/anchor-without-href"]);
	});
	it("accepts the svelte {href} shorthand", () => assert.deepEqual(rulesFor("<a {href}>Ir</a>"), []));
	it("catches placeholder-only inputs but accepts labels", () => {
		assert.deepEqual(rulesFor("<input placeholder=\"Buscar\" />"), ["jakob/placeholder-as-label"]);
		assert.deepEqual(rulesFor("<label for=\"q\">Busca</label><input id=\"q\" placeholder=\"ex.: nota\" />"), []);
		assert.deepEqual(rulesFor("<label>Busca <input placeholder=\"ex.: nota\" /></label>"), []);
	});
});
describe("miller/ungrouped-fields", () => {
	const field = "<label>c <input aria-label=\"c\" /></label>";
	it("passes grouped forms", () => assert.deepEqual(rulesFor(`<form><fieldset><legend>a</legend>${field.repeat(5)}</fieldset></form>`), []));
	it("catches long flat forms", () => assert.deepEqual(rulesFor(`<form>${field.repeat(5)}</form>`), ["miller/ungrouped-fields"]));
});
describe("von-restorff/single-primary", () => {
	it("passes one primary", () => assert.deepEqual(rulesFor("<button type=\"button\" class=\"h-10 bg-primary\">A</button><button type=\"button\" class=\"h-10\">B</button>"), []));
	it("catches two primaries", () => {
		const two = "<button type=\"button\" class=\"h-10 bg-primary\">A</button><a href=\"/\" class=\"h-10 bg-primary\">B</a>";
		assert.deepEqual(rulesFor(two), ["von-restorff/single-primary"]);
	});
	it("does not count bg-primary-soft", () => assert.deepEqual(rulesFor("<a href=\"/\" class=\"bg-primary-soft\">A</a><a href=\"/\" class=\"bg-primary\">B</a>"), []));
});
describe("uniform-connectedness/choice-group", () => {
	const radios = "<label><input type=\"radio\" name=\"plano\" /> A</label><label><input type=\"radio\" name=\"plano\" /> B</label>";
	it("passes inside a fieldset", () => assert.deepEqual(rulesFor(`<fieldset><legend>Plano</legend>${radios}</fieldset>`), []));
	it("catches loose radios", () => assert.deepEqual(rulesFor(radios), ["uniform-connectedness/choice-group"]));
});
describe("tesler", () => {
	it("passes a complete email field", () => assert.deepEqual(rulesFor("<label>E-mail <input name=\"email\" type=\"email\" autocomplete=\"email\" /></label>"), []));
	it("catches missing autocomplete and wrong type", () => {
		assert.deepEqual(rulesFor("<label>E-mail <input name=\"email\" /></label>").sort(), ["tesler/autocomplete", "tesler/input-type"]);
	});
});
describe("ignore comments and config", () => {
	it("honours design-ignore-next-line", () => {
		assert.deepEqual(rulesFor("<!-- design-ignore-next-line fitts/target-size: ícone -->\n<button type=\"button\" class=\"h-6\">x</button>"), []);
	});
	it("honours design-ignore-file for everything but colour", () => assert.deepEqual(rulesFor("<!-- design-ignore-file -->\n<button type=\"button\" class=\"h-6\">x</button>"), []));
	it("does not take a short number reference like '#104' for a colour", () => {
		assert.deepEqual(rulesFor("const pr = { externalId: '#104', title: 'PR #2026' };"), []);
		assert.deepEqual(rulesFor("const c = '#1a4';"), ["brand/tokens-only"]);
	});
	// triste: cor não se cala — nem por linha, nem por arquivo.
	it("never silences the colour rules", () => {
		assert.deepEqual(rulesFor("<!-- design-ignore-file -->\n<div class=\"bg-black\"></div>"), ["brand/no-pure-black-white"]);
		assert.deepEqual(rulesFor("// design-ignore-next-line brand/tokens-only: gradiente\nconst HEAT = ['#fde68a'];"), ["brand/tokens-only"]);
		assert.deepEqual(rulesFor("// design-ignore-next-line\nconst c = 'bg-violet-600';"), ["brand/tokens-only"]);
	});
	it("skips disabled laws", () => {
		const off = {
			...config,
			laws: {
				...config.laws,
				fitts: {
					enabled: false,
					minTargetPx: 40
				}
			}
		};
		assert.deepEqual(rulesFor("<button type=\"button\" class=\"h-6\">x</button>", "src/x.svelte", off), []);
	});
	it("reports the right line", () => {
		const [v] = checkSource("src/x.svelte", "<p>a</p>\n\n<div class=\"bg-black\"></div>", config);
		assert.equal(v.line, 3);
	});
	it("summarizes the active rules for the agent", () => {
		const text = summarize(config);
		assert.match(text, /teste-design/);
		assert.match(text, /40px/);
	});
});
describe("casos de borda", () => {
	it("reads heights from inline styles, honoring min-height", () => {
		assert.deepEqual(rulesFor("<button type=\"button\" style=\"height: 24px\">x</button>"), ["fitts/target-size"]);
		assert.deepEqual(rulesFor("<button type=\"button\" style=\"height: 24px; min-height: 44px\">x</button>"), []);
	});
	it("asks for a numeric keyboard on postal codes", () => {
		assert.deepEqual(rulesFor("<label>CEP <input name=\"cep\" autocomplete=\"postal-code\" /></label>"), ["tesler/input-type"]);
		assert.deepEqual(rulesFor("<label>CEP <input name=\"cep\" autocomplete=\"postal-code\" inputmode=\"numeric\" /></label>"), []);
	});
	it("respects ignored paths, extensions and the project root as scan dir", () => {
		assert.equal(isInScope("src/node_modules/x.svelte", config), false);
		assert.equal(isInScope("src/readme.md", config), false);
		assert.equal(isInScope("lib/x.svelte", config), false);
		assert.equal(isInScope("lib/x.svelte", {
			...config,
			scan: {
				...config.scan,
				dirs: ["."]
			}
		}), true);
	});
	it("formats errors and warnings with location, rule and hint", () => {
		const text = formatViolations("src/x.svelte", [{
			rule: "a/b",
			law: "Lei",
			severity: "error",
			line: 3,
			message: "Erro.",
			hint: "Dica."
		}, {
			rule: "c/d",
			law: "Lei",
			severity: "warning",
			line: 4,
			message: "Aviso.",
			hint: "Dica."
		}]);
		assert.equal(text, "✕ src/x.svelte:3  [a/b] Erro.\n    Lei: Dica.\n! src/x.svelte:4  [c/d] Aviso.\n    Lei: Dica.");
	});
});

describe("regras de marca estendidas (Azuos 2.0)", () => {
	it("no-gradients-or-glass: bloqueia gradientes e blur, aprova superfícies sólidas", () => {
		const bad1 = rulesFor('<div className="bg-gradient-to-r from-primary to-accent" />', "src/x.tsx");
		assert.ok(bad1.includes("brand/no-gradients-or-glass"));

		const bad2 = rulesFor('<div className="backdrop-blur-md bg-card/80" />', "src/x.tsx");
		assert.ok(bad2.includes("brand/no-gradients-or-glass"));

		const good = rulesFor('<div className="bg-card text-foreground" />', "src/x.tsx");
		assert.ok(!good.includes("brand/no-gradients-or-glass"));
	});

	it("static-zuzu: bloqueia animações no mascote Zuzu", () => {
		const bad = rulesFor('<img src="/zuzu.png" alt="Zuzu mascote" className="animate-bounce" />', "src/x.tsx");
		assert.ok(bad.includes("brand/static-zuzu"));

		const good = rulesFor('<img src="/zuzu.png" alt="Zuzu mascote" className="size-8" />', "src/x.tsx");
		assert.ok(!good.includes("brand/static-zuzu"));
	});

	it("canonical-back-button: bloqueia botão de voltar manual fora do AzuosBackButton", () => {
		const bad = rulesFor('<button type="button">Voltar para empresas</button>', "src/x.tsx");
		assert.ok(bad.includes("brand/canonical-back-button"));

		const good = rulesFor('<button type="button" data-slot="azuos-back-button">Voltar para empresas</button>', "src/x.tsx");
		assert.ok(!good.includes("brand/canonical-back-button"));
	});

	it("solid-inputs: bloqueia inputs com bg-transparent", () => {
		const bad = rulesFor('<input type="text" className="bg-transparent border" />', "src/features/login.tsx");
		assert.ok(bad.includes("brand/solid-inputs"));

		const good = rulesFor('<input type="text" className="bg-muted border" />', "src/features/login.tsx");
		assert.ok(!good.includes("brand/solid-inputs"));
	});

	it("no-card-opacity: bloqueia classes de opacidade e transparência em cards", () => {
		const bad1 = rulesFor('<div className="bg-card/80 p-4" data-slot="card" />', "src/components/my-card.tsx");
		assert.ok(bad1.includes("brand/no-card-opacity"));

		const bad2 = rulesFor('<div className="bg-primary opacity-60 p-4" data-slot="azuos-hero-card" />', "src/components/my-card.tsx");
		assert.ok(bad2.includes("brand/no-card-opacity"));

		const good = rulesFor('<div className="bg-card text-card-foreground p-4" data-slot="card" />', "src/components/my-card.tsx");
		assert.ok(!good.includes("brand/no-card-opacity"));

		const heroWatermark = rulesFor('<div data-slot="hero-card-icon" className="opacity-15 text-primary-foreground" />', "src/components/azuos-hero-card.component.tsx");
		assert.ok(!heroWatermark.includes("brand/no-card-opacity"));
	});

	it("dual-file-actions: exige download e hyperlink em componentes de arquivo", () => {
		const onlyDownload = rulesFor('<a href="/file" download="doc.pdf">Baixar</a>', "src/lib/components/azuos-file-links.tsx");
		assert.ok(onlyDownload.includes("brand/dual-file-actions"));

		const complete = rulesFor(
			'<a href="/file" target="_blank" rel="noopener noreferrer">Abrir</a><a href="/file" download="doc.pdf">Baixar</a>',
			"src/lib/components/azuos-file-links.tsx"
		);
		assert.ok(!complete.includes("brand/dual-file-actions"));
	});

	it("paste-file-attachment: exige onPaste (Ctrl+V) em campos de upload/anexo", () => {
		const noPaste = rulesFor('<div className="dropzone"><input type="file" /></div>', "src/lib/components/azuos-attachment-picker.tsx");
		assert.ok(noPaste.includes("brand/paste-file-attachment"));

		const withPaste = rulesFor('<div className="dropzone" onPaste={handlePaste}><input type="file" /></div>', "src/lib/components/azuos-attachment-picker.tsx");
		assert.ok(!withPaste.includes("brand/paste-file-attachment"));

		const anyName = rulesFor('<div><button>Anexar</button><input type="file" /></div>', "src/routes/employees/components/azuos-employee-card.component.tsx");
		assert.ok(anyName.includes("brand/paste-file-attachment"));

		const withUtil = rulesFor('<div onPaste={pasteFilesIntoInput}><input type="file" /></div>', "src/routes/employees/components/azuos-employee-card.component.tsx");
		assert.ok(!withUtil.includes("brand/paste-file-attachment"));
	});
});
