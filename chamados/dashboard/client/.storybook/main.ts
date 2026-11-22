import { type StorybookConfig } from '@storybook/sveltekit';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.svelte'],
  /* `addon-essentials` não existe mais: do Storybook 9 em diante controls, actions,
     viewport, backgrounds e docs vêm no core, e o pacote foi descontinuado. Sobra o a11y,
     que continua sendo addon — e é o que o CONTRIBUTING exige em todo primitivo. O
     addon-svelte-csf traz o formato `<Story>` que o Svelte 5 usa no lugar do CSF3 do React. */
  addons: ['@storybook/addon-a11y', '@storybook/addon-svelte-csf'],
  framework: { name: '@storybook/sveltekit', options: {} },
  core: { disableTelemetry: true },
  /* Sem o quadro "Get started" do Storybook: o começo deste catálogo são as próprias stories. */
  features: { sidebarOnboardingChecklist: false, menuOnboardingChecklist: false },
  /* O ícone da aba do navegador: a arara da Azuos, direto da CDN da marca (sem cópia no app). */
  managerHead: (head) => `${head ?? ''}
    <link rel="icon" type="image/svg+xml" href="https://cdn.grupoazuos.com.br/logo/svg/icon.svg" />
    <title>Azuos · Design System</title>`,
};

export default config;
