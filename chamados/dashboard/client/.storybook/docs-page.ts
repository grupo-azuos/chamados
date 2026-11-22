import {
  Controls,
  Description,
  DocsContainer,
  type DocsContainerProps,
  Primary,
  Stories,
  Subtitle,
  Title,
  useOf,
} from '@storybook/addon-docs/blocks';
import { createElement as h, Fragment, type PropsWithChildren } from 'react';
import { create } from 'storybook/theming';

import { COMPONENT_DOCS } from './component-docs';

/* A página Docs é desenhada pelo addon-docs, que é React em qualquer framework; as histórias
   dentro dela continuam sendo Svelte. Escrita com `createElement` (o `h`), e não em JSX: o
   `tsconfig` deste projeto Svelte não liga o JSX, e assim o `typecheck` confere este arquivo. */

const SYSTEM_FONT =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, system-ui, sans-serif";

/* A moldura da página Docs (título, tabela de props, blocos de código) nas cores do padrão
   Apple — clara ou grafite, igual ao tema escolhido no botão "Tema". */
const DOCS_THEMES = {
  light: create({
    base: 'light',
    appBg: '#F2F2F7',
    appContentBg: '#FFFFFF',
    appPreviewBg: '#F2F2F7',
    appBorderColor: '#E3E3E8',
    appBorderRadius: 14,
    colorPrimary: '#007AFF',
    colorSecondary: '#007AFF',
    textColor: '#1D1D1F',
    textMutedColor: '#6E6E73',
    fontBase: SYSTEM_FONT,
  }),
  dark: create({
    base: 'dark',
    appBg: '#161618',
    appContentBg: '#161618',
    appPreviewBg: '#161618',
    appBorderColor: '#333336',
    appBorderRadius: 14,
    colorPrimary: '#0A84FF',
    colorSecondary: '#0A84FF',
    textColor: '#F5F5F7',
    textMutedColor: '#98989D',
    fontBase: SYSTEM_FONT,
  }),
};

export type ThemeName = keyof typeof DOCS_THEMES;

/** O tema escolhido na barra, lido dos globals do Storybook. */
export function themeOf(globals: Record<string, unknown> | undefined): ThemeName {
  return globals?.theme === 'dark' ? 'dark' : 'light';
}

/** A página Docs inteira segue o tema: a moldura do Storybook e os tokens dos componentes. */
export function ThemedDocsContainer(props: PropsWithChildren<DocsContainerProps>) {
  const store = (
    props.context as { store?: { userGlobals?: { globals?: Record<string, unknown> } } }
  ).store;
  const theme = themeOf(store?.userGlobals?.globals);
  document.documentElement.dataset.theme = theme;

  return h(DocsContainer, { ...props, theme: DOCS_THEMES[theme] });
}

/**
 * A PÁGINA "DOCS" DE TODO COMPONENTE, na mesma ordem em todos:
 *
 * 1. o nome e o texto de escolha (para que serve, quando usar, quando não usar), de
 *    `component-docs.ts`;
 * 2. o exemplo principal e a tabela de props;
 * 3. o comentário técnico do próprio componente (o `<!-- @component -->` do `.svelte`);
 * 4. todas as variações.
 */
export function AzuosDocsPage() {
  const meta = useOf('meta', ['meta']);
  const name = meta.preparedMeta.title.split('/').pop() ?? '';
  const doc = COMPONENT_DOCS[name];

  return h(
    Fragment,
    null,
    h(Title),
    h(Subtitle),
    doc
      ? h(
          'section',
          { className: 'azuos-doc-guide' },
          h('p', { className: 'azuos-doc-summary' }, doc.summary),
          h(
            'div',
            { className: 'azuos-doc-columns' },
            guideColumn('Quando usar', doc.use),
            guideColumn('Quando não usar', doc.avoid),
          ),
        )
      : null,
    h(Primary),
    h(Controls),
    h('h2', null, 'Como ele funciona'),
    h(Description),
    h(Stories, { title: 'Variações' }),
  );
}

/** Uma coluna do bloco de escolha: o título e a lista. */
function guideColumn(title: string, items: string[]) {
  return h(
    'div',
    null,
    h('h3', null, title),
    h('ul', null, ...items.map((item) => h('li', { key: item }, ...renderInline(item)))),
  );
}

/** Os nomes entre crases viram código, como no resto da documentação. */
function renderInline(text: string) {
  return text
    .split(/(`[^`]+`)/)
    .map((part, index) =>
      part.startsWith('`') ? h('code', { key: index }, part.slice(1, -1)) : part,
    );
}
