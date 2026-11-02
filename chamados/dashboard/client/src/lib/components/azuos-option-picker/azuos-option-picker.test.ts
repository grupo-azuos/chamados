import { fireEvent, render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import Check from '@lucide/svelte/icons/check';

import OptionPicker from './azuos-option-picker.svelte';

it('keeps search available with few options when combobox mode is requested', async () => {
  const onChange = vi.fn();
  render(OptionPicker, {
    data: {
      value: '',
      options: [
        { value: '', label: 'Todos' },
        { value: '1', label: 'Azuos Ticket' },
      ],
    },
    ui: { ariaLabel: 'Sistema', mode: 'combobox' },
    actions: { onChange },
  });
  await userEvent.click(screen.getByRole('button', { name: 'Sistema' }));
  // jsdom has no floating-element geometry, so the popover is present but marked hidden.
  const search = await screen.findByPlaceholderText('Buscar…');
  const popup = search.closest('[data-slot="popover-content"]') as HTMLElement;
  await fireEvent.input(search, { target: { value: 'AZUOS' } });
  expect(within(popup).queryByText('Todos')).not.toBeInTheDocument();
  await fireEvent.click(within(popup).getByText('Azuos Ticket'));
  expect(onChange).toHaveBeenCalledWith('1');
});

const few = [
  { value: 'open', label: 'Abertos' },
  { value: 'done', label: 'Resolvidos' },
];

/** Sete opções: uma a mais do que cabe em pastilha, então o campo vira botão com busca. */
const many = Array.from({ length: 7 }, (_value, index) => ({
  value: `option-${index}`,
  label: `Opção ${index}`,
}));

describe('AzuosOptionPicker — selected name tooltip', () => {
  const label = 'Sala de atendimento compartilhada (ATENDIMENTO-ESTACAO-04)';
  const props = {
    data: { value: '1', options: [{ value: '1', label }] },
    ui: { ariaLabel: 'Máquina', mode: 'combobox' as const, showSelectedTooltip: true },
    actions: { onChange: vi.fn() },
  };

  // feliz
  it('shows the full selected name on hover and still opens search on click', async () => {
    render(OptionPicker, { props });
    const trigger = screen.getByRole('button', { name: 'Máquina' });
    await userEvent.hover(trigger);
    expect(await screen.findByRole('tooltip')).toHaveTextContent(label);

    await userEvent.click(trigger);
    expect(await screen.findByPlaceholderText('Buscar…')).toBeInTheDocument();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('shows the full selected name on keyboard focus', async () => {
    render(OptionPicker, { props });
    await userEvent.tab();
    expect(await screen.findByRole('tooltip')).toHaveTextContent(label);
  });
});

/** Seis opções: ainda são pastilhas numa barra de filtro, mas não cabem num campo de formulário. */
const six = Array.from({ length: 6 }, (_value, index) => ({
  value: `type-${index}`,
  label: `Tipo ${index}`,
}));

describe('AzuosOptionPicker — in a form', () => {
  // feliz
  /* Num campo de formulário, pastilha só serve enquanto cabe em uma linha. */
  it('keeps up to three options as pills, one column each', () => {
    const three = six.slice(0, 3);
    render(OptionPicker, {
      props: {
        data: { value: 'type-0', options: three },
        ui: { ariaLabel: 'Tipo', fullWidth: true },
        actions: { onChange: vi.fn() },
      },
    });

    for (const option of three)
      expect(screen.getByRole('button', { name: option.label })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Tipo' }).className).toContain('grid-cols-3');
  });

  /* Com mais de três, vira a lista que abre: as opções não ficam espalhadas pelo diálogo. */
  it('turns into the dropdown when there are more than three options', () => {
    render(OptionPicker, {
      props: {
        data: { value: 'type-4', options: six },
        ui: { ariaLabel: 'Tipo', fullWidth: true },
        actions: { onChange: vi.fn() },
      },
    });

    expect(screen.queryByRole('group')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Tipo 0' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Tipo' })).toHaveTextContent('Tipo 4');
  });

  // triste
  /* A mesma lista de seis, numa barra de filtro, continua em pastilhas: lá há largura. */
  it('still shows six options as pills in a filter bar', () => {
    render(OptionPicker, {
      props: { data: { value: '', options: six }, actions: { onChange: vi.fn() } },
    });

    expect(screen.getByRole('button', { name: 'Tipo 5' })).toBeInTheDocument();
  });
});

describe('AzuosOptionPicker', () => {
  // feliz
  /* Com poucas opções a pessoa compara e troca com um clique, sem abrir nada. */
  it('lays few options out as pills, all visible at once', () => {
    render(OptionPicker, {
      props: { data: { value: 'open', options: few }, actions: { onChange: vi.fn() } },
    });

    expect(screen.getByRole('button', { name: 'Abertos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resolvidos' })).toBeInTheDocument();
  });

  it('reports which option was chosen', async () => {
    const onChange = vi.fn();
    render(OptionPicker, {
      props: { data: { value: 'open', options: few }, actions: { onChange } },
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Resolvidos' }));

    expect(onChange).toHaveBeenCalledWith('done');
  });

  /* "Todos" representa o valor vazio — é o que faz o filtro voltar a não filtrar. */
  it('adds the all option in front and reports it as the empty value', async () => {
    const onChange = vi.fn();
    render(OptionPicker, {
      props: {
        data: { value: 'open', options: few },
        ui: { allLabel: 'Todos os status' },
        actions: { onChange },
      },
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Todos os status' }));

    expect(onChange).toHaveBeenCalledWith('');
  });

  /* Pastilha lado a lado com muitas opções viraria uma parede de botões. */
  it('turns into a single button with search when there are too many options', () => {
    render(OptionPicker, {
      props: {
        data: { value: 'option-3', options: many },
        ui: { placeholder: 'Selecione' },
        actions: { onChange: vi.fn() },
      },
    });

    expect(screen.getByRole('button', { name: /Opção 3/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Opção 5' })).not.toBeInTheDocument();
  });

  // triste
  /* `userEvent`, e não `fireEvent`: o `fireEvent` dispara o evento na marra e o botão
     desabilitado responde assim mesmo, o que nenhum navegador faz. O teste precisa recusar
     o clique pelo mesmo motivo que o navegador recusa. */
  it('does not report anything while disabled', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(OptionPicker, {
      props: {
        data: { value: 'open', options: few },
        state: { isDisabled: true },
        actions: { onChange },
      },
    });

    await user.click(screen.getByRole('button', { name: 'Resolvidos' }));

    expect(onChange).not.toHaveBeenCalled();
  });

  /* Valor que não está na lista é filtro salvo de uma versão anterior da tela: o campo mostra
     o texto de "nada escolhido" em vez do valor cru. */
  it('falls back to the placeholder when the chosen value is not in the list (edge case)', () => {
    render(OptionPicker, {
      props: {
        data: { value: 'sumiu', options: many },
        ui: { placeholder: 'Selecione' },
        actions: { onChange: vi.fn() },
      },
    });

    expect(screen.getByRole('button', { name: /Selecione/ })).toBeInTheDocument();
  });

  it('draws nothing to choose from when there is no option (edge case)', () => {
    render(OptionPicker, {
      props: {
        data: { value: '', options: [] },
        ui: { ariaLabel: 'Situação' },
        actions: { onChange: vi.fn() },
      },
    });

    expect(screen.getByRole('group', { name: 'Situação' }).children).toHaveLength(0);
  });
});

// feliz: no celular, mesmo um filtro curto abre uma lista em vez de espremer pastilhas.
it('uses a searchable list for few options on mobile', async () => {
  const originalMatchMedia = window.matchMedia;
  const media = vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
    ...originalMatchMedia.call(window, query),
    matches: query === '(max-width: 639px)',
  }));
  try {
    const onChange = vi.fn();
    render(OptionPicker, {
      data: { value: '', options: few },
      ui: { ariaLabel: 'Situação', allLabel: 'Todas as situações' },
      actions: { onChange },
    });
    expect(screen.queryByRole('group', { name: 'Situação' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Situação' }));
    const search = await screen.findByPlaceholderText('Buscar…');
    const popup = search.closest('[data-slot="popover-content"]') as HTMLElement;
    await fireEvent.click(within(popup).getByText('Abertos'));
    expect(onChange).toHaveBeenCalledWith('open');
  } finally {
    media.mockRestore();
  }
});

/* Os dois testes do separador ficaram, num merge, DENTRO do teste do celular — e o Vitest recusa
   teste dentro de teste, derrubando os três. Cada um volta a ser um teste de verdade. */
describe('AzuosOptionPicker — separador de grupo', () => {
  // feliz
  it('draws a divider before the option that starts a new group', async () => {
    const user = userEvent.setup();
    render(OptionPicker, {
      props: {
        data: {
          value: '',
          options: [
            { value: 'Fiscal', label: 'Fiscal' },
            { value: 'ANALYZE', label: 'ANALYZE', separatorBefore: true },
          ],
        },
        ui: { ariaLabel: 'Departamento', mode: 'combobox' },
        actions: { onChange: vi.fn() },
      },
    });

    await user.click(screen.getByRole('button', { name: 'Departamento' }));

    expect(await screen.findByRole('separator')).toBeInTheDocument();
  });

  // triste
  it('draws no divider when the grouped option is the first one shown', async () => {
    const user = userEvent.setup();
    render(OptionPicker, {
      props: {
        data: {
          value: '',
          options: [{ value: 'ANALYZE', label: 'ANALYZE', separatorBefore: true }],
        },
        ui: { ariaLabel: 'Departamento', mode: 'combobox' },
        actions: { onChange: vi.fn() },
      },
    });

    await user.click(screen.getByRole('button', { name: 'Departamento' }));
    await screen.findByRole('button', { name: 'ANALYZE' });

    expect(screen.queryByRole('separator')).not.toBeInTheDocument();
  });
});

describe('AzuosOptionPicker — free value', () => {
  const known = [
    { value: 'ana', label: 'Ana Souza' },
    { value: 'bia', label: 'Bia Costa' },
  ];

  // feliz
  it('offers to use what was typed when no option matches', async () => {
    const onCustomValue = vi.fn();
    render(OptionPicker, {
      data: { value: '', options: known },
      ui: { ariaLabel: 'Responsável', allowCustomValue: true },
      actions: { onChange: vi.fn(), onCustomValue },
    });

    await userEvent.click(screen.getByRole('button', { name: 'Responsável' }));
    const search = await screen.findByPlaceholderText('Buscar…');
    await fireEvent.input(search, { target: { value: 'Equipe externa' } });
    await fireEvent.click(screen.getByText('Usar “Equipe externa”'));

    expect(onCustomValue).toHaveBeenCalledWith('Equipe externa');
  });

  /* Sem um tratador próprio, o valor livre segue pelo mesmo caminho das opções conhecidas. */
  it('shows the free value as the chosen one and hands it to onChange without a custom handler', async () => {
    const onChange = vi.fn();
    render(OptionPicker, {
      data: { value: 'Equipe externa', options: known },
      ui: { ariaLabel: 'Responsável', allowCustomValue: true },
      actions: { onChange },
    });

    const trigger = screen.getByRole('button', { name: 'Responsável' });
    expect(trigger).toHaveTextContent('Equipe externa');
    await userEvent.click(trigger);
    await fireEvent.input(await screen.findByPlaceholderText('Buscar…'), { target: { value: 'Outro time' } });
    await fireEvent.click(screen.getByText('Usar “Outro time”'));

    expect(onChange).toHaveBeenCalledWith('Outro time');
  });

  // triste
  it('asks for a name when there is nothing to pick and nothing typed', async () => {
    render(OptionPicker, {
      data: { value: '', options: [] },
      ui: { ariaLabel: 'Responsável', allowCustomValue: true },
      actions: { onChange: vi.fn() },
    });

    await userEvent.click(screen.getByRole('button', { name: 'Responsável' }));

    expect(await screen.findByText('Digite um nome na busca para usá-lo.')).toBeInTheDocument();
  });

  it('points the trigger at the error and draws the icon of the chosen option', () => {
    render(OptionPicker, {
      data: { value: 'ana', options: [{ value: 'ana', label: 'Ana Souza', icon: Check }, known[1]!] },
      ui: { ariaLabel: 'Responsável', mode: 'combobox' },
      state: { error: 'Escolha quem atende' },
      actions: { onChange: vi.fn() },
    });

    const trigger = screen.getByRole('button', { name: 'Responsável' });
    expect(trigger).toHaveAttribute('aria-invalid', 'true');
    expect(trigger).toHaveAttribute('aria-describedby', screen.getByRole('alert').id);
    /* O desenho da opção mais a seta do combo. */
    expect(trigger.querySelectorAll('svg')).toHaveLength(2);
  });
});

describe('AzuosOptionPicker with people', () => {
  const people = Array.from({ length: 10 }, (_, index) => ({
    value: `p${index}`,
    label: `Pessoa ${index}`,
    personName: `Pessoa ${index}`,
  }));

  // feliz
  it('shows the initials of the chosen person in the button', () => {
    render(OptionPicker, {
      props: { data: { value: 'p3', options: people }, ui: { ariaLabel: 'Responsável' }, actions: { onChange: vi.fn() } },
    });

    expect(screen.getByRole('button', { name: /Responsável/ })).toHaveTextContent('P3');
  });

  // triste
  it('draws no avatar when the options are not people', () => {
    render(OptionPicker, {
      props: {
        data: { value: 'a', options: [{ value: 'a', label: 'Alta' }, { value: 'b', label: 'Baixa' }] },
        ui: { ariaLabel: 'Urgência' },
        actions: { onChange: vi.fn() },
      },
    });

    expect(document.querySelector('[data-slot="avatar"]')).toBeNull();
  });
});
