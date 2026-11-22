import { type Decorator, type Preview } from '@storybook/svelte';

import '../src/lib/theme/tokens.css';
import './preview.css';
import './docs.css';
import { AzuosDocsPage, type ThemeName, ThemedDocsContainer, themeOf } from './docs-page';

/**
 * A história que roda num iframe DENTRO da página Docs não recebe o tema da barra: ela herda o
 * da página em volta, que é a mesma origem.
 */
function parentDocsTheme(): ThemeName | null {
  if (window.parent === window) return null;
  try {
    const theme = window.parent.document.documentElement.dataset.theme;
    return theme === 'dark' || theme === 'light' ? theme : null;
  } catch {
    return null;
  }
}

/** Claro ou escuro, pelo botão da barra do Storybook — o mesmo `data-theme` que o app usa. */
const withTheme: Decorator = (Story, context) => {
  document.documentElement.dataset.theme = parentDocsTheme() ?? themeOf(context.globals);
  return Story();
};

const preview: Preview = {
  /* Gera a página "Docs" de todo componente, no molde de `docs-page.tsx`: o texto de escolha, o
     exemplo, as props, o comentário técnico e as variações. */
  tags: ['autodocs'],
  decorators: [withTheme],
  globalTypes: {
    theme: {
      description: 'Claro ou escuro',
      toolbar: {
        title: 'Tema',
        icon: 'mirror',
        items: [
          { value: 'light', title: 'Claro', icon: 'sun' },
          { value: 'dark', title: 'Escuro (grafite)', icon: 'moon' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'light' },
  parameters: {
    controls: { expanded: true },
    docs: {
      page: AzuosDocsPage,
      container: ThemedDocsContainer,
      toc: { headingSelector: 'h2, h3' },
    },
    /* A régua pede que TUDO funcione em 400px de largura (skill `ui-standards`, §Responsivo).
       Estes dois tamanhos são o que as stories usam para mostrar a mesma tela nas duas
       formas: cartão empilhado no celular e tabela no computador. */
    viewport: {
      options: {
        celular: {
          name: 'Celular (400px)',
          styles: { width: '400px', height: '860px' },
          type: 'mobile',
        },
        tablet: {
          name: 'Tablet (820px)',
          styles: { width: '820px', height: '1180px' },
          type: 'tablet',
        },
      },
    },
    /* Sem fundo fixo: o fundo da história vem do token `--background` (ver `preview.css`), e
       troca com o tema. Um hex aqui deixaria o escuro com o fundo do claro. */
    backgrounds: { disable: true },
    /* A ordem do menu: primeiro o texto (Introdução e Fundamentos, na ordem de leitura), depois
       os componentes genéricos e os das features; dentro de cada grupo, em ordem alfabética. */
    options: {
      storySort: {
        method: 'alphabetical',
        order: [
          'Introdução',
          'Fundamentos',
          [
            'Padrão Apple',
            'Cores',
            'Forma e sombra',
            'Tipografia',
            'Organização das telas',
            'Portas de entrada do shadcn',
          ],
          'Components',
          'Features',
        ],
      },
    },
    // A equipe opera o sistema no teclado o dia inteiro; contraste e foco são requisito.
    a11y: { config: { rules: [{ id: 'color-contrast', enabled: true }] } },
  },
};

export default preview;
