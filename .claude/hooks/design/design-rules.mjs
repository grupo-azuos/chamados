/**
 * Regras de design verificáveis no código: as da marca (só tokens, sem preto/branco puro) e
 * as das leis de UX (Hick, Fitts, Jakob, Miller, Von Restorff, Conectividade Uniforme,
 * Tesler).
 *
 * Sem dependência. No brand maker é TypeScript; no kit vai como JavaScript (.mjs), com os
 * tipos tirados no build. Por isso só sintaxe "apagável" (tipos, nada de enum, namespace ou
 * parameter property), que vira JavaScript sem mudar o comportamento.
 *
 * As checagens são estáticas, por expressão regular, sobre .svelte/.tsx/.jsx/.vue/.html/.css.
 * Elas pegam o erro comum, não provam que a tela está certa: a skill `ux-laws` diz o que
 * ainda precisa de olho humano.
 *
 * Para silenciar um caso justificado, comente na linha de cima:
 *   <!-- design-ignore-next-line fitts/target-size: ícone dentro de um alvo de 40px -->
 *   // design-ignore-next-line
 * Ou `design-ignore-file` em qualquer lugar do arquivo.
 *
 * EXCEÇÃO: as regras de COR (`brand/tokens-only`, `brand/no-pure-black-white`) não se silenciam
 * de jeito nenhum. Toda cor vem do `tokens.css`; cor nova entra lá, e nunca no componente.
 */
/* ------------------------------------------------------------------ utilitários */
/** Apaga comentários HTML e de bloco, mantendo as quebras de linha (os números de linha batem). */
function stripComments(content) {
	const blank = (match) => match.replace(/[^\n]/g, " ");
	return content.replace(/<!--[\s\S]*?-->/g, blank).replace(/\/\*[\s\S]*?\*\//g, blank);
}
function lineOf(code, index) {
	let line = 1;
	for (let i = 0; i < index && i < code.length; i++) if (code[i] === "\n") line++;
	return line;
}
/** Todas as ocorrências de `pattern` (precisa da flag g). */
function* matches(code, pattern) {
	const re = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g");
	let m;
	while ((m = re.exec(code)) !== null) {
		yield m;
		if (m[0].length === 0) re.lastIndex++;
	}
}
/**
* Tags de abertura pelo nome. Tolera um nível de `{...}` nos atributos (Svelte/JSX), onde um
* `>` de comparação não fecha a tag.
*/
function tags(code, names) {
	const pattern = new RegExp(`<(${names})\\b(?:[^>{}]|\\{[^{}]*\\})*>`, "g");
	return [...matches(code, pattern)].map((m) => ({
		name: m[1],
		text: m[0],
		index: m.index
	}));
}
/** Blocos `<tag ...>...</tag>` (sem aninhamento do mesmo nome). */
function blocks(code, name) {
	const pattern = new RegExp(`<${name}\\b[\\s\\S]*?<\\/${name}>`, "g");
	return [...matches(code, pattern)].map((m) => ({
		text: m[0],
		index: m.index
	}));
}
function attr(tag, name) {
	const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|\\{([^}]*)\\})`));
	if (m) return m[1] ?? m[2] ?? m[3] ?? "";
	// Atalho do Svelte: {href} equivale a href={href}.
	if (new RegExp(`\\{\\s*${name}\\s*\\}`).test(tag)) return "";
	return null;
}
const hasAttr = (tag, name) => attr(tag, name) !== null || /\{\s*\.\.\./.test(tag);
/** Classes de utilitário de cor do Tailwind (prefixos que recebem cor). */
const COLOR_UTILITY = "(?:bg|text|border(?:-[trblxy])?|ring|ring-offset|fill|stroke|from|via|to|outline|divide|shadow|decoration|caret|accent|placeholder)";
const TAILWIND_PALETTE = "(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)";
const INTERACTIVE_TAGS = "button|a|input|select|textarea|summary";
const SMALL_INPUT_TYPES = /\btype\s*=\s*["'](?:checkbox|radio|hidden|range|color|file)["']/;
/* ------------------------------------------------------------------ regras da marca */
const noPureBlackWhite = {
	id: "brand/no-pure-black-white",
	law: "Marca",
	severity: "error",
	description: "Preto puro e branco puro são proibidos pela marca.",
	hint: "Use os tokens: `foreground`/`background` (ou `primary-foreground`) já são os tons quase-preto e quase-branco da marca.",
	enabled: (c) => c.brandRules.noPureBlackWhite,
	check: (file) => {
		const patterns = [
			/#(?:000|fff|000000|ffffff)(?:f|ff)?\b/gi,
			/\brgba?\(\s*(?:0\s*,\s*0\s*,\s*0|255\s*,\s*255\s*,\s*255)\b/gi,
			/(?:^|[\s;{])(?:color|background(?:-color)?|border(?:-[a-z]+)?-?color|fill|stroke|outline-color)\s*:\s*(?:black|white)\b/gim,
			new RegExp(`\\b${COLOR_UTILITY}-(?:black|white)\\b`, "g")
		];
		return patterns.flatMap((p) => [...matches(file.code, p)].map((m) => ({
			index: m.index,
			message: `Cor proibida: \`${m[0].trim()}\`.`
		})));
	}
};
function isColorHex(code, index, hex) {
	if (![
		3,
		4,
		6,
		8
	].includes(hex.length)) return false;
	/* `#104`, `#2026`: número de PR, de protocolo, de chamado — não é cor. Cor curta de verdade tem letra. */
	if (hex.length <= 4 && /^\d+$/.test(hex)) return false;
	const before = code.slice(Math.max(0, index - 6), index);
	if (/[\w&]$/.test(before)) return false;
	return !/(?:href=["']?|url\(\s*["']?|id=["']?)$/.test(before);
}
const tokensOnly = {
	id: "brand/tokens-only",
	law: "Marca",
	severity: "error",
	description: "Cor só por token. Cor crua (hex, rgb, hsl, oklch) ou paleta padrão do Tailwind fica fora da marca.",
	hint: "Troque por uma classe de token (`bg-primary`, `text-muted-foreground`, `border-border`) ou `var(--token)`. Cor nova entra primeiro no tokens.css.",
	enabled: (c) => c.brandRules.tokensOnly,
	check: (file) => {
		if (file.isTokenFile) return [];
		const found = [];
		for (const m of matches(file.code, /#([0-9a-fA-F]{3,8})\b/g)) {
			if (isColorHex(file.code, m.index, m[1])) found.push({
				index: m.index,
				message: `Cor crua \`${m[0]}\`.`
			});
		}
		for (const m of matches(file.code, /\b(?:rgba?|hsla?|oklch|oklab|lab|lch)\(\s*[\d.]/g)) {
			found.push({
				index: m.index,
				message: `Cor crua \`${m[0]}…)\`.`
			});
		}
		const palette = new RegExp(`\\b${COLOR_UTILITY}-${TAILWIND_PALETTE}-(?:50|[1-9]00|950)\\b`, "g");
		for (const m of matches(file.code, palette)) {
			found.push({
				index: m.index,
				message: `Paleta padrão do Tailwind \`${m[0]}\`.`
			});
		}
		return found;
	}
};
const noArbitraryValues = {
	id: "brand/no-arbitrary-values",
	law: "Marca",
	severity: "warning",
	description: "Valor arbitrário de cor, raio, sombra ou fonte foge da escala do design.",
	hint: "Use a escala: `rounded-lg`/`rounded-[var(--radius)]` via token, `text-sm`, `shadow-sm`. Se falta um degrau, crie o token.",
	enabled: (c) => c.brandRules.noArbitraryValues,
	check: (file) => [...matches(file.code, /\b(?:rounded(?:-[a-z]{1,2})?|shadow|text|bg|border|ring|font|leading|tracking)-\[(?!var\()[^\]\s]+\]/g)].map((m) => ({
		index: m.index,
		message: `Valor arbitrário \`${m[0]}\`.`
	}))
};
const noGradientsOrGlass = {
	id: "brand/no-gradients-or-glass",
	law: "Marca",
	severity: "error",
	description: "Gradientes, glassmorphism e efeitos de blur/transparência arbitrária são proibidos na identidade Azuos.",
	hint: "Cards e superfícies devem ser 100% sólidos (`bg-card`, `bg-muted`). Remova gradientes e `backdrop-blur`.",
	enabled: (c) => c.brandRules?.noGradientsOrGlass ?? true,
	check: (file) => {
		if (file.isTokenFile) return [];
		const patterns = [
			/\bbg-gradient-[a-z0-9-]+/g,
			/\bbackdrop-blur(?:-[a-z0-9]+)?\b/g,
			/\bbackdrop-filter\b/g
		];
		return patterns.flatMap((p) => [...matches(file.code, p)].map((m) => ({
			index: m.index,
			message: `Efeito proibido pela marca: \`${m[0]}\`. Superfícies devem ser 100% sólidas.`
		})));
	}
};
function isWatermarkLine(code, index) {
	const start = Math.max(0, index - 250);
	const end = Math.min(code.length, index + 250);
	const snippet = code.slice(start, end);
	return /hero-card-icon|hero-watermark|data-slot="hero-card-icon"/i.test(snippet);
}

function findCardOpacityViolations(code, pattern) {
	const found = [];
	for (const m of matches(code, pattern)) {
		if (isWatermarkLine(code, m.index)) continue;
		found.push({
			index: m.index,
			message: `Opacidade proibida em card: \`${m[0]}\`. Cards devem ter cor 100% sólida.`
		});
	}
	return found;
}

const noCardOpacity = {
	id: "brand/no-card-opacity",
	law: "Marca",
	severity: "error",
	description: "Cards e superfícies devem ser 100% sólidos. Opacidades e transparências em cards são estritamente proibidas.",
	hint: "Use cores 100% sólidas da paleta. Remova classes com barra de opacidade (`bg-*/...`, `opacity-*`) em cards.",
	enabled: (c) => c.brandRules?.noCardOpacity ?? true,
	check: (file) => {
		if (file.isTokenFile) return [];
		const isCardFile = /card|surface/i.test(file.path);
		if (!isCardFile && !/data-slot="[^"]*card[^"]*"|role="article"/i.test(file.code)) return [];
		const patterns = [
			/\bbg-[a-z0-9-]+(?:\/[0-9]{1,2})\b/g,
			/\bopacity-[0-9]{1,2}\b/g
		];
		return patterns.flatMap((pattern) => findCardOpacityViolations(file.code, pattern));
	}
};
const staticZuzu = {
	id: "brand/static-zuzu",
	law: "Marca",
	severity: "error",
	description: "O mascote Zuzu deve permanecer estático. Animações, rotações e oscilações são proibidas.",
	hint: "Remova classes de animação (`animate-*`, rotação/escala) do mascote Zuzu.",
	enabled: (c) => c.brandRules?.staticZuzu ?? true,
	check: (file) => {
		const found = [];
		const zuzuTags = [...matches(file.code, /<[^>]*(?:zuzu|mascot)[^>]*>/gi)];
		for (const tag of zuzuTags) {
			if (/\banimate-|\bhover:rotate|\bhover:scale/i.test(tag[0])) {
				found.push({
					index: tag.index,
					message: `Animação proibida no Zuzu: mascote deve ser sempre estático.`
				});
			}
		}
		return found;
	}
};
const canonicalBackButton = {
	id: "brand/canonical-back-button",
	law: "Marca",
	severity: "error",
	description: "O botão de voltar canônico AzuosBackButton é obrigatório. Variações manuais de botão de voltar são proibidas.",
	hint: "Use `<AzuosBackButton data={{ destination: '...' }} />` com formato `← Voltar para [destino]`.",
	enabled: (c) => c.brandRules?.canonicalBackButton ?? true,
	check: (file) => {
		if (file.path.includes("azuos-back-button") || file.path.includes("/ui/")) return [];
		const found = [];
		for (const m of matches(file.code, /<(?:button|a)\b[^>]*>(?:(?!<\/(?:button|a)>)[\s\S])*?(?:Voltar\s+para|Retornar)[\s\S]*?<\/(?:button|a)>/gi)) {
			if (!m[0].includes('data-slot="azuos-back-button"') && !m[0].includes("AzuosBackButton")) {
				found.push({
					index: m.index,
					message: "Botão de voltar fora do padrão AzuosBackButton."
				});
			}
		}
		return found;
	}
};
const solidInputs = {
	id: "brand/solid-inputs",
	law: "Marca",
	severity: "error",
	description: "Campos de entrada de formulário devem ter fundo sólido bg-muted, nunca bg-transparent.",
	hint: "Use `bg-muted` sólido para manter contraste consistente entre claro e escuro.",
	enabled: (c) => c.brandRules?.solidInputs ?? true,
	check: (file) => {
		if (file.path.includes("/ui/") || file.isTokenFile) return [];
		const found = [];
		for (const tag of tags(file.code, "input|textarea")) {
			if (tag.text.includes("bg-transparent") && !SMALL_INPUT_TYPES.test(tag.text)) {
				found.push({
					index: tag.index,
					message: "Campo de entrada com `bg-transparent`. Todos os campos devem ter fundo sólido `bg-muted`."
				});
			}
		}
		return found;
	}
};
const dualFileActions = {
	id: "brand/dual-file-actions",
	law: "Marca",
	severity: "warning",
	description: "Funções de arquivo devem sempre disponibilizar download e visualização via hyperlink.",
	hint: "Use o componente canônico `<AzuosFileLinks />` ou disponibilize links com download e target=\"_blank\".",
	enabled: (c) => c.brandRules?.dualFileActions ?? true,
	check: (file) => {
		if (file.path.includes("/ui/") || file.isTokenFile) return [];
		const isFileFeature = /file.*link|attachment.*list/i.test(file.path);
		if (!isFileFeature) return [];
		const hasDownload = /\bdownload\b/i.test(file.code);
		const hasHyperlink = /target=["']_blank["']/i.test(file.code) || /\bviewUrl\b/i.test(file.code);
		if ((hasDownload && !hasHyperlink) || (!hasDownload && hasHyperlink)) {
			return [{
				index: 0,
				message: "Componente de arquivo incompleto: deve fornecer ambas as funções de download e abrir via hyperlink."
			}];
		}
		return [];
	}
};
const pasteFileAttachment = {
	id: "brand/paste-file-attachment",
	law: "Marca",
	severity: "warning",
	description: "Locais de anexar arquivos devem suportar colagem de arquivos/imagens via Ctrl+V.",
	hint: "Ponha `onPaste={pasteFilesIntoInput}` (lib/utils/paste-files.util) no elemento que contém o campo de arquivo.",
	enabled: (c) => c.brandRules?.pasteFileAttachment ?? true,
	check: (file) => {
		if (file.path.includes("/ui/") || file.isTokenFile || /\.(test|stories)\.[jt]sx?$/.test(file.path)) return [];
		/* Todo campo de arquivo, e não só os que têm "upload" no nome: a regra vale para qualquer
		   lugar de anexar. `pasteFilesIntoInput` (lib/utils) é o jeito pronto de cumprir. */
		if (/type=["']file["']/i.test(file.code) && !/\bonPaste\b|pasteFilesIntoInput/.test(file.code)) {
			return [{
				index: 0,
				message: "Componente de anexo de arquivo sem suporte a Ctrl+V (área de transferência)."
			}];
		}
		return [];
	}
};
/* ------------------------------------------------------------------ Lei de Hick */
const hickNavItems = {
	id: "hick/nav-items",
	law: "Lei de Hick",
	severity: "warning",
	description: "Menu com opções demais aumenta o tempo de decisão.",
	hint: "Agrupe itens raros num \"Mais\" ou mova-os para a página onde fazem sentido.",
	enabled: (c) => c.laws.hick.enabled,
	check: (file, c) => blocks(file.code, "nav").flatMap((nav) => {
		const count = tags(nav.text, "a|button").length;
		const max = c.laws.hick.maxNavItems;
		return count > max ? [{
			index: nav.index,
			message: `Menu com ${count} itens (máximo ${max}).`
		}] : [];
	})
};
const hickSelectOptions = {
	id: "hick/select-options",
	law: "Lei de Hick",
	severity: "warning",
	description: "Select com opções demais obriga a ler a lista inteira.",
	hint: "Troque por um campo com busca (combobox) ou agrupe com <optgroup>.",
	enabled: (c) => c.laws.hick.enabled,
	check: (file, c) => blocks(file.code, "select").flatMap((select) => {
		const count = tags(select.text, "option").length;
		const max = c.laws.hick.maxSelectOptions;
		const grouped = /<optgroup\b/.test(select.text);
		return count > max && !grouped ? [{
			index: select.index,
			message: `Select com ${count} opções (máximo ${max}).`
		}] : [];
	})
};
/* ------------------------------------------------------------------ Lei de Fitts */
const TAILWIND_SPACING_PX = 4;
/** Altura declarada num tag (Tailwind `h-*`/`size-*`/`min-h-*`, `h-[Npx]` ou style inline), em px. */
function declaredHeights(tag) {
	const fixed = [];
	let min = null;
	for (const m of matches(tag, /(?<![\w-])(min-h|h|size)-(\d+(?:\.\d+)?|\[(\d+)px\])(?![\w.-])/g)) {
		const px = m[3] ? Number(m[3]) : Number(m[2]) * TAILWIND_SPACING_PX;
		if (m[1] === "min-h") {
			min = Math.max(min ?? 0, px);
			continue;
		}
		fixed.push(px);
	}
	for (const m of matches(tag, /(min-)?height\s*:\s*(\d+)px/g)) {
		if (m[1]) {
			min = Math.max(min ?? 0, Number(m[2]));
			continue;
		}
		fixed.push(Number(m[2]));
	}
	return {
		min,
		fixed
	};
}

function checkFittsTags(code, minPx) {
	const found = [];
	const candidates = [
		...tags(code, INTERACTIVE_TAGS),
		...tags(code, "[a-z][\\w-]*").filter((t) => /\brole\s*=\s*["']button["']/.test(t.text))
	];
	for (const tag of candidates) {
		if (tag.name === "input" && SMALL_INPUT_TYPES.test(tag.text)) continue;
		const { min, fixed } = declaredHeights(tag.text);
		if (min !== null && min >= minPx) continue;
		const tooSmall = fixed.filter((px) => px < minPx);
		if (tooSmall.length && tooSmall.length === fixed.length) {
			found.push({
				index: tag.index,
				message: `<${tag.name}> com ${Math.max(...tooSmall)}px de altura (mínimo ${minPx}px).`
			});
		}
	}
	return found;
}

function checkFittsCss(code, minPx) {
	const found = [];
	for (const m of matches(code, /([^{}]+)\{([^{}]*)\}/g)) {
		const selector = m[1];
		if (!/\b(?:button|btn|input|select|textarea)\b|\[role=["']?button/.test(selector)) continue;
		const height = m[2].match(/(?:^|[;\s])height\s*:\s*(\d+)px/);
		if (height && Number(height[1]) < minPx) {
			found.push({
				index: m.index + m[0].indexOf(height[0]),
				message: `\`${selector.trim()}\` com ${height[1]}px de altura (mínimo ${minPx}px).`
			});
		}
	}
	return found;
}

const fittsTargetSize = {
	id: "fitts/target-size",
	law: "Lei de Fitts",
	severity: "error",
	description: "Alvo de clique ou toque pequeno demais.",
	hint: "Dê ao controle a altura mínima da marca (ex.: `h-10`). Ícone pequeno vai dentro de um botão do tamanho mínimo.",
	enabled: (c) => c.laws.fitts.enabled,
	check: (file, c) => [
		...checkFittsTags(file.code, c.laws.fitts.minTargetPx),
		...checkFittsCss(file.code, c.laws.fitts.minTargetPx)
	]
};
/* ------------------------------------------------------------------ Lei de Jakob */
const jakobClickable = {
	id: "jakob/clickable-non-interactive",
	law: "Lei de Jakob",
	severity: "error",
	description: "Elemento não interativo com clique: não recebe foco, não responde a teclado e não parece clicável.",
	hint: "Use <button type=\"button\"> para ação e <a href> para navegação.",
	enabled: (c) => c.laws.jakob.enabled,
	check: (file) => tags(file.code, "div|span|li|p|img|section|article|td|tr|label|header|footer").filter((t) => /\b(?:onclick|on:click|onClick)\s*=/.test(t.text)).map((t) => ({
		index: t.index,
		message: `<${t.name}> com clique.`
	}))
};
const jakobAnchorHref = {
	id: "jakob/anchor-without-href",
	law: "Lei de Jakob",
	severity: "error",
	description: "Link sem destino: não abre em nova aba, não aparece para leitor de tela como link.",
	hint: "Se navega, dê um `href`. Se executa uma ação, é um <button>.",
	enabled: (c) => c.laws.jakob.enabled,
	check: (file) => tags(file.code, "a").filter((t) => !hasAttr(t.text, "href")).map((t) => ({
		index: t.index,
		message: "<a> sem href."
	}))
};
function insideLabel(code, index) {
	const before = code.slice(0, index);
	return before.lastIndexOf("<label") > before.lastIndexOf("</label>");
}
function hasLabelFor(code, id) {
	return new RegExp(`\\b(?:for|htmlFor)\\s*=\\s*["'{]${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'}]`).test(code);
}
const jakobPlaceholderLabel = {
	id: "jakob/placeholder-as-label",
	law: "Lei de Jakob",
	severity: "warning",
	description: "Campo só com placeholder: o rótulo some ao digitar.",
	hint: "Use <label for> visível (ou aria-label quando o contexto já diz o que é). O placeholder fica como exemplo.",
	enabled: (c) => c.laws.jakob.enabled,
	check: (file) => tags(file.code, "input|textarea").filter((t) => hasAttr(t.text, "placeholder")).filter((t) => !/\btype\s*=\s*["'](?:hidden|submit|button|checkbox|radio|reset|image)["']/.test(t.text)).filter((t) => !hasAttr(t.text, "aria-label") && !hasAttr(t.text, "aria-labelledby") && !hasAttr(t.text, "title")).filter((t) => !insideLabel(file.code, t.index)).filter((t) => {
		const id = attr(t.text, "id");
		return id === null || id === "" || !hasLabelFor(file.code, id);
	}).map((t) => ({
		index: t.index,
		message: `<${t.name}> sem rótulo (só placeholder).`
	}))
};
/* ------------------------------------------------------------------ Lei de Miller */
function countFields(code) {
	const native = tags(code, "input|select|textarea").filter((t) => !/\btype\s*=\s*["'](?:hidden|submit|button|reset|image)["']/.test(t.text)).length;
	const components = [...matches(code, /<[A-Z]\w*(?:Field|Input|Select|Textarea|Picker)\b/g)].length;
	return native + components;
}
const millerUngrouped = {
	id: "miller/ungrouped-fields",
	law: "Lei de Miller",
	severity: "warning",
	description: "Formulário longo sem grupos sobrecarrega a memória de trabalho.",
	hint: "Divida em <fieldset> com <legend> (dados pessoais, endereço, pagamento) ou em etapas.",
	enabled: (c) => c.laws.miller.enabled,
	check: (file, c) => blocks(file.code, "form").flatMap((form) => {
		const count = countFields(form.text);
		const max = c.laws.miller.maxUngroupedFields;
		const grouped = /<fieldset\b|role\s*=\s*["']group["']/.test(form.text);
		return count > max && !grouped ? [{
			index: form.index,
			message: `Formulário com ${count} campos sem agrupar (máximo ${max}).`
		}] : [];
	})
};
/* ------------------------------------------------------------------ Efeito Von Restorff */
function isPrimaryAction(tag) {
	return /\bbg-primary(?![\w-])/.test(tag) || /\bvariant\s*=\s*["']primary["']/.test(tag) || /\b(?:btn|button)(?:--|-)primary\b/.test(tag);
}
const vonRestorffPrimary = {
	id: "von-restorff/single-primary",
	law: "Efeito Von Restorff",
	severity: "warning",
	description: "Ação primária demais na mesma tela: quando tudo se destaca, nada se destaca.",
	hint: "Mantenha uma ação primária por tela; as outras viram secundárias (contorno ou fantasma).",
	enabled: (c) => c.laws.vonRestorff.enabled,
	check: (file, c) => {
		const max = c.laws.vonRestorff.maxPrimaryActions;
		const primaries = tags(file.code, `${INTERACTIVE_TAGS}|[A-Z]\\w*Button`).filter((t) => isPrimaryAction(t.text));
		if (primaries.length <= max) return [];
		return primaries.slice(max).map((t) => ({
			index: t.index,
			message: `${primaries.length} ações primárias no arquivo (máximo ${max}).`
		}));
	}
};
/* ------------------------------------------------------------------ Conectividade Uniforme */
const uniformChoiceGroup = {
	id: "uniform-connectedness/choice-group",
	law: "Conectividade Uniforme",
	severity: "warning",
	description: "Opções do mesmo grupo soltas, sem contorno comum.",
	hint: "Envolva as opções em <fieldset> com <legend>, ou num container com role=\"radiogroup\"/\"group\" e aria-label.",
	enabled: (c) => c.laws.uniformConnectedness.enabled,
	check: (file) => {
		const groups = new Map();
		for (const tag of tags(file.code, "input")) {
			if (!/\btype\s*=\s*["'](?:radio|checkbox)["']/.test(tag.text)) continue;
			const name = attr(tag.text, "name");
			if (!name) continue;
			groups.set(name, [...groups.get(name) ?? [], tag.index]);
		}
		const grouped = /<fieldset\b|role\s*=\s*["'](?:radiogroup|group)["']/.test(file.code);
		if (grouped) return [];
		return [...groups.entries()].filter(([, indexes]) => indexes.length >= 2).map(([name, indexes]) => ({
			index: indexes[0],
			message: `Grupo "${name}" com ${indexes.length} opções sem <fieldset>.`
		}));
	}
};
/* ------------------------------------------------------------------ Lei de Tesler */
const FIELD_KINDS = [
	{
		pattern: /e-?mail/i,
		autocomplete: "email",
		type: "email"
	},
	{
		pattern: /\b(?:tel|phone|fone|telefone|celular|whats(?:app)?)\b/i,
		autocomplete: "tel",
		type: "tel"
	},
	{
		pattern: /\b(?:cep|zip|postal(?:-?code)?)\b/i,
		autocomplete: "postal-code",
		inputmode: "numeric"
	},
	{
		pattern: /\b(?:nome|name|full-?name)\b/i,
		autocomplete: "name"
	},
	{
		pattern: /\b(?:endereco|address|street|logradouro)\b/i,
		autocomplete: "street-address"
	},
	{
		pattern: /\b(?:cpf|cnpj)\b/i,
		autocomplete: "off",
		inputmode: "numeric"
	}
];
function fieldKind(tag) {
	const key = [attr(tag, "name"), attr(tag, "id")].filter(Boolean).join(" ");
	return key ? FIELD_KINDS.find((k) => k.pattern.test(key)) : undefined;
}
const teslerAutocomplete = {
	id: "tesler/autocomplete",
	law: "Lei de Tesler",
	severity: "warning",
	description: "Campo comum sem autocomplete: a pessoa digita o que o navegador já sabe.",
	hint: "Adicione `autocomplete` com o valor padrão do HTML para o campo.",
	enabled: (c) => c.laws.tesler.enabled,
	check: (file) => tags(file.code, "input").flatMap((t) => {
		const kind = fieldKind(t.text);
		if (!kind || hasAttr(t.text, "autocomplete")) return [];
		return [{
			index: t.index,
			message: "Campo sem autocomplete.",
			hint: `Use autocomplete="${kind.autocomplete}".`
		}];
	})
};
const teslerInputType = {
	id: "tesler/input-type",
	law: "Lei de Tesler",
	severity: "warning",
	description: "Tipo de campo genérico: no celular abre o teclado errado e não valida.",
	hint: "Use o `type`/`inputmode` do conteúdo: email, tel, numeric.",
	enabled: (c) => c.laws.tesler.enabled,
	check: (file) => tags(file.code, "input").flatMap((t) => {
		const kind = fieldKind(t.text);
		if (!kind) return [];
		const type = attr(t.text, "type");
		if (kind.type && type !== kind.type) {
			return [{
				index: t.index,
				message: `Campo de ${kind.autocomplete} com type="${type ?? "text"}".`,
				hint: `Use type="${kind.type}".`
			}];
		}
		if (kind.inputmode && attr(t.text, "inputmode") === null) {
			return [{
				index: t.index,
				message: "Campo numérico sem inputmode.",
				hint: `Use inputmode="${kind.inputmode}".`
			}];
		}
		return [];
	})
};
/* ------------------------------------------------------------------ motor */
export const RULES = [
	noPureBlackWhite,
	tokensOnly,
	noArbitraryValues,
	noGradientsOrGlass,
	noCardOpacity,
	staticZuzu,
	canonicalBackButton,
	solidInputs,
	dualFileActions,
	pasteFileAttachment,
	hickNavItems,
	hickSelectOptions,
	fittsTargetSize,
	jakobClickable,
	jakobAnchorHref,
	jakobPlaceholderLabel,
	millerUngrouped,
	vonRestorffPrimary,
	uniformChoiceGroup,
	teslerAutocomplete,
	teslerInputType
];
/** Caminho com `/`, para casar com a config em qualquer sistema. */
const normalize = (path) => path.replace(/\\/g, "/");
export function isTokenFile(path, config) {
	const p = normalize(path);
	return config.scan.tokenFiles.some((name) => p === name || p.endsWith(`/${name}`));
}
export function isInScope(path, config) {
	const p = normalize(path);
	if (config.scan.ignore.some((part) => p.includes(part))) return false;
	if (!config.scan.extensions.some((ext) => p.endsWith(ext))) return false;
	return config.scan.dirs.some((dir) => dir === "." || p === dir || p.startsWith(`${normalize(dir).replace(/\/$/, "")}/`));
}
/** As regras que NENHUM `design-ignore` cala: cor é só por token, sem exceção por arquivo. */
export const UNSILENCEABLE_RULES = new Set(["brand/tokens-only", "brand/no-pure-black-white"]);
/** Linhas com `design-ignore-next-line [regra…]` silenciam a linha de baixo. */
function ignoredLines(content) {
	const ignored = new Map();
	content.split("\n").forEach((text, i) => {
		const m = text.match(/design-ignore-next-line(?:\s+([\w/,\s-]+?))?(?::|-->|\*\/|$)/);
		if (!m) return;
		const rules = m[1]?.split(/[\s,]+/).filter((r) => r.includes("/"));
		ignored.set(i + 2, rules?.length ? rules : "all");
	});
	return ignored;
}
export function checkSource(path, content, config) {
	const ignoreFile = content.includes("design-ignore-file");
	const file = {
		path: normalize(path),
		code: stripComments(content),
		isTokenFile: isTokenFile(path, config)
	};
	const ignored = ignoredLines(content);
	return RULES.filter((rule) => rule.enabled(config) && (!ignoreFile || UNSILENCEABLE_RULES.has(rule.id))).flatMap((rule) => rule.check(file, config).map((f) => ({
		rule: rule.id,
		law: rule.law,
		severity: rule.severity,
		line: lineOf(file.code, f.index),
		message: f.message,
		hint: f.hint ?? rule.hint
	}))).filter((v) => {
		if (UNSILENCEABLE_RULES.has(v.rule)) return true;
		const skip = ignored.get(v.line);
		return !skip || skip !== "all" && !skip.includes(v.rule);
	}).sort((a, b) => a.line - b.line);
}
export function formatViolations(path, violations) {
	return violations.map((v) => `${v.severity === "error" ? "✕" : "!"} ${path}:${v.line}  [${v.rule}] ${v.message}\n    ${v.law}: ${v.hint}`).join("\n");
}
/** Resumo curto das regras para o contexto do agente (hook SessionStart). */
export function summarize(config) {
	const { laws } = config;
	const lines = [
		`Design de "${config.brand}": siga as skills ${config.skill} e ux-laws.`,
		"- Cor só por token (bg-primary, text-foreground…); nunca hex cru, paleta padrão do Tailwind, preto ou branco puro.",
		laws.fitts.enabled && `- Fitts: alvo de clique/toque com no mínimo ${laws.fitts.minTargetPx}px de altura.`,
		laws.hick.enabled && `- Hick: menu com até ${laws.hick.maxNavItems} itens; select com mais de ${laws.hick.maxSelectOptions} opções vira busca.`,
		laws.jakob.enabled && "- Jakob: link é <a href>, ação é <button>; todo campo tem rótulo.",
		laws.miller.enabled && `- Miller: formulário com mais de ${laws.miller.maxUngroupedFields} campos é agrupado em <fieldset>.`,
		laws.vonRestorff.enabled && `- Von Restorff: até ${laws.vonRestorff.maxPrimaryActions} ação primária por tela.`,
		laws.uniformConnectedness.enabled && "- Conectividade uniforme: opções do mesmo grupo dentro de <fieldset>/role=\"group\".",
		laws.tesler.enabled && "- Tesler: type e autocomplete certos em e-mail, telefone, nome, endereço, CEP.",
		"Um hook confere cada arquivo editado e devolve as violações; corrija antes de seguir."
	];
	return lines.filter(Boolean).join("\n");
}
