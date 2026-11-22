import { type Decorator, type Preview } from '@storybook/svelte';

import '../src/lib/theme/tokens.css';
import './preview.css';

type ThemeName = 'light' | 'dark';

/** O tema escolhido na barra, lido dos globals do Storybook. */
function themeOf(globals: Record<string, unknown> | undefined): ThemeName {
  return globals?.theme === 'dark' ? 'dark' : 'light';
}

/** Claro ou escuro, pelo botão da barra do Storybook — o mesmo `data-theme` que o app usa. */
const withTheme: Decorator = (Story, context) => {
  document.documentElement.dataset.theme = themeOf(context.globals);
  return Story();
};

const preview: Preview = {
  /* Gera a página "Docs" pra todo componente automaticamente — puxa o comentário que já
     existe em cima de cada `export function` como descrição, mais a tabela de props. Sem
     isto, a única forma de saber o que um compositor faz é abrir o `.tsx` e ler o código. */
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
    /* A ordem do menu: primeiro o texto, depois os componentes, as telas das features e o
       resto; dentro de cada grupo, em ordem alfabética. */
    options: {
      storySort: {
        method: 'alphabetical',
        order: ['Introdução', 'Fundamentos', 'Components', 'Features'],
      },
    },
    // A equipe opera o sistema no teclado o dia inteiro; contraste e foco são requisito.
    a11y: { config: { rules: [{ id: 'color-contrast', enabled: true }] } },
  },
};

export default preview;
