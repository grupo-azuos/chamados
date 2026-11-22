import { type StorybookConfig } from '@storybook/sveltekit';

const config: StorybookConfig = {
  /* Primeiro as páginas de texto (Introdução e Fundamentos), depois as stories de cada componente. */
  stories: ['./docs/**/*.mdx', '../src/**/*.stories.svelte'],
  /* `addon-essentials` não existe mais: do Storybook 9 em diante controls, actions,
     viewport e backgrounds vêm no core. Ficam o a11y (exigido pelo CONTRIBUTING em todo
     primitivo), o docs, que monta a página de texto de cada componente (o que é, quando usar,
     quando não usar) e as páginas MDX dos fundamentos, e o addon-svelte-csf, que traz o formato
     `<Story>` que o Svelte 5 usa no lugar do CSF3 do React. */
  addons: ['@storybook/addon-a11y', '@storybook/addon-docs', '@storybook/addon-svelte-csf'],
  framework: { name: '@storybook/sveltekit', options: {} },
  core: { disableTelemetry: true },
  /* Sem o quadro "Get started" do Storybook: o começo deste catálogo é a página Introdução. */
  features: { sidebarOnboardingChecklist: false, menuOnboardingChecklist: false },
  /* O ícone da aba do navegador: a arara da Azuos, direto da CDN da marca (sem cópia no app). */
  managerHead: (head) => `${head ?? ''}
    <link rel="icon" type="image/svg+xml" href="https://cdn.grupoazuos.com.br/logo/svg/icon.svg" />
    <title>Azuos · Design System</title>`,
};

export default config;
