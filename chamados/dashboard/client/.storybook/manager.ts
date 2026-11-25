import { addons } from 'storybook/manager-api';
import { create } from 'storybook/theming';

/**
 * A MOLDURA DO STORYBOOK no padrão Apple: a marca da Azuos no lugar da do Storybook, o azul do
 * sistema como cor principal, o fundo cinza e os cantos grandes. Segue o claro ou o escuro do
 * computador de quem abre.
 */
const isDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;

const SYSTEM_FONT =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, system-ui, sans-serif";

/* A marca vem da CDN do grupo, sem cópia no app (como em `brand-asset.util.ts`): o ícone da
   arara + o nome. Sem `brandImage`, o Storybook desenha o `brandTitle` como HTML; assim o
   mesmo ícone serve no claro e no escuro, e o texto pega a cor do tema. */
const BRAND_ICON_URL = 'https://cdn.grupoazuos.com.br/logo/svg/icon.svg';

const BRAND_TITLE = `<span style="display:inline-flex;align-items:center;gap:10px;font-weight:600;font-size:15px">
  <img src="${BRAND_ICON_URL}" alt="" width="32" height="32" style="border-radius:28%" />
  <span>Azuos · Design System</span>
</span>`;

addons.setConfig({
  theme: create({
    base: isDark ? 'dark' : 'light',
    brandTitle: BRAND_TITLE,
    brandUrl: './',
    brandTarget: '_self',
    colorPrimary: isDark ? '#0A84FF' : '#007AFF',
    colorSecondary: isDark ? '#0A84FF' : '#007AFF',
    appBg: isDark ? '#161618' : '#F2F2F7',
    appContentBg: isDark ? '#222225' : '#FFFFFF',
    appPreviewBg: isDark ? '#161618' : '#F2F2F7',
    appBorderColor: isDark ? '#333336' : '#E3E3E8',
    appBorderRadius: 14,
    fontBase: SYSTEM_FONT,
    textColor: isDark ? '#F5F5F7' : '#1D1D1F',
    textMutedColor: isDark ? '#98989D' : '#6E6E73',
    barBg: isDark ? '#222225' : '#FFFFFF',
    inputBg: isDark ? '#2C2C2F' : '#ECECF0',
    inputBorder: 'transparent',
    inputBorderRadius: 10,
  }),
  sidebar: { showRoots: true },
});
