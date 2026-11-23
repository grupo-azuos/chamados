/**
 * OS TEXTOS DA DOCUMENTAÇÃO de cada componente — o que aparece no topo da aba "Docs" do
 * Storybook, antes dos exemplos e da tabela de props.
 *
 * Cada entrada responde três perguntas, nesta ordem: para que serve, quando usar e quando NÃO
 * usar (e o que usar no lugar). O comentário técnico do próprio componente continua aparecendo
 * logo abaixo; aqui é o texto para quem vai ESCOLHER o componente, não para quem vai mexer nele.
 * A chave é o nome exportado (o fim do `title` da story).
 */
export type ComponentDoc = {
  /** Para que serve, em uma ou duas frases. */
  summary: string;
  /** Quando usar. */
  use: string[];
  /** Quando não usar — e o que usar no lugar. */
  avoid: string[];
};

export const COMPONENT_DOCS: Record<string, ComponentDoc> = {
  /* ------------------------------------------------------------------ Ações */
  AzuosActionButton: {
    summary:
      'O botão de ação do sistema: salvar, exportar, abrir um diálogo. Pílula azul (principal) ou cinza (secundário), com a régua de altura, o estado de carregando e o nome acessível já prontos.',
    use: [
      'Toda ação de tela que não é enviar formulário.',
      'Uma ação principal por área; as outras ficam no secundário.',
    ],
    avoid: [
      'Enviar formulário: use o `AzuosSubmitButton`, que trava o duplo clique.',
      'Gatilho de menu ou popover: use o `Button` de `azuos-button`, que recebe as props do gatilho (o `child` do bits-ui).',
    ],
  },
  AzuosButtonGroup: {
    summary:
      'Botões que são uma escolha só, lado a lado (Dia · Semana · Mês), no desenho segmentado: um trilho cinza em pílula e a opção escolhida numa pastilha azul que desliza até ela. Deitado ou em pé.',
    use: ['Trocar o período ou o recorte de um gráfico.', 'Abas curtas dentro de um card.'],
    avoid: [
      'Mais de quatro opções ou espaço estreito: use o `AzuosOptionPicker`, que vira lista.',
      'Filtros que se somam: use chips ou o `AzuosMultiSelectField`.',
    ],
  },
  AzuosClearFiltersButton: {
    summary:
      'O "Limpar filtros" de toda tela que filtra. Só aparece quando há filtro ligado, e limpar devolve a tela ao padrão dela.',
    use: ['No fim da barra de filtros de qualquer lista.'],
    avoid: ['Para desfazer um formulário: aí é o botão "Cancelar" do próprio formulário.'],
  },
  AzuosCopyButton: {
    summary:
      'O botão de copiar que fica dentro da caixa de um código, comando ou link: só o ícone, com a dica, o ✓ "Copiado!" por dois segundos e sem quebrar quando o navegador não deixa copiar.',
    use: [
      'Ao lado de um texto que a pessoa vai colar em outro lugar (token, comando, endereço).',
      'Na caixa invertida (fundo escuro), com o tom `inverse`.',
    ],
    avoid: [
      'Ação principal da área: use o `AzuosActionButton` com rótulo.',
      'Texto que a pessoa só lê: deixe sem botão, para não poluir a tela.',
    ],
  },
  AzuosFileLinks: {
    summary:
      'Os dois caminhos de um arquivo anexado: abrir numa aba nova e baixar com o nome original. Regra da casa: todo arquivo tem as duas ações.',
    use: ['Ao lado de qualquer arquivo mostrado na tela.'],
    avoid: [
      'Lista de vários anexos com excluir: use o `AzuosAttachmentList`, que já traz estas ações.',
    ],
  },
  AzuosReportExportActions: {
    summary:
      'Os três botões de "baixar relatório" (Excel, Word e PDF), sempre na mesma forma. Quem gera o arquivo é a tela; o componente só mostra, avisa o clique e trava os outros enquanto um baixa.',
    use: ['No cabeçalho de telas de relatório e de listas exportáveis.'],
    avoid: ['Para baixar um anexo: use o `AzuosFileLinks`.'],
  },

  /* ------------------------------------------------------------------ Formulários */
  AzuosAttachmentPicker: {
    summary:
      'A escolha dos arquivos antes do envio: arrastar, clicar ou colar com Ctrl+V. Mostra os escolhidos e recusa o que passa do limite, dizendo o motivo.',
    use: ['Todo lugar de anexar arquivo (regra da casa: aceita Ctrl+V).'],
    avoid: ['Para mostrar arquivos já enviados: use o `AzuosAttachmentList`.'],
  },
  AzuosCalendar: {
    summary:
      'O calendário da casa, igual ao do template: as setas nas pontas do título, o mês e o ano no meio (pelo `AzuosCalendarDropdown`), hoje em cinza, o dia escolhido em azul e o período ligado por uma faixa. Uma data ou um período, em português.',
    use: [
      'Por baixo de todo calendário do sistema (o `AzuosDatePicker` e o `AzuosDateRangeField` já o trazem).',
    ],
    avoid: [
      'Direto numa tela: use o `AzuosDatePicker` (uma data) ou o `AzuosDateRangeField` (período).',
      'Datas distantes (nascimento): use o `AzuosDateField`, que pergunta o ano primeiro.',
    ],
  },
  AzuosCalendarDropdown: {
    summary:
      'O seletor de mês e de ano no título de um calendário, no lugar do `<select>` nativo, com o visual da casa.',
    use: ['Dentro dos calendários do sistema (já vem neles).'],
    avoid: ['Fora de um calendário: para escolher mês, use o `AzuosMonthPickerField`.'],
  },
  AzuosCheckboxField: {
    summary: 'Uma caixa de marcar com o rótulo ao lado, para o "sim ou não" que não tem "não sei".',
    use: ['Aceite, ligar uma opção num formulário, marcar itens de uma lista.'],
    avoid: [
      'Quando "não sei" é resposta válida: use o `AzuosSelectField` com três opções.',
      'Liga e desliga com efeito na hora: prefira um botão de alternar.',
    ],
  },
  AzuosCityPickerField: {
    summary:
      'A cidade escolhida em dois passos: primeiro a UF, depois um município dela, guardado pelo código. Acaba com a cidade digitada de cinco jeitos diferentes.',
    use: ['Todo campo de cidade de endereço, empresa ou filtro.'],
    avoid: ['Texto livre de cidade: nunca.'],
  },
  AzuosColorSwatchField: {
    summary:
      'Escolha de cor: "aleatória", as cinco cores da paleta e qualquer outra pelo seletor do navegador. Cor livre clara troca o texto por cima para escuro.',
    use: ['Cor de etiqueta, de empresa, de categoria.'],
    avoid: ['Para escolher status: o status já tem cor própria no domínio.'],
  },
  AzuosComboboxField: {
    summary:
      'Campo de seleção com pesquisa, para listas longas em que rolar não é viável: dezenas de clientes, etiquetas ou responsáveis.',
    use: ['Lista com 15 opções ou mais.', 'Quando a pessoa sabe o nome e quer digitar.'],
    avoid: [
      'Poucas opções: use o `AzuosSelectField` ou o `AzuosOptionPicker`.',
      'Escolher pessoa: use o `AzuosPersonPickerField`.',
    ],
  },
  AzuosCreatableComboboxField: {
    summary:
      'Combobox com busca que também cadastra: se o termo não existe, a última opção é "Cadastrar «termo»".',
    use: ['Catálogos que crescem com o uso (cidade, setor, tipo de documento).'],
    avoid: ['Listas fechadas, que só o administrador muda: use o `AzuosComboboxField`.'],
  },
  AzuosCreatableMultiSelectField: {
    summary: 'Escolher várias opções com busca e cadastrar a que falta, sem sair do formulário.',
    use: ['Etiquetas e categorias em que um registro leva várias.'],
    avoid: ['Uma escolha só: use o `AzuosCreatableComboboxField`.'],
  },
  AzuosDateField: {
    summary:
      'O campo de uma data: a pessoa digita dd/mm/aaaa ou abre o calendário, que pergunta ano, mês e dia.',
    use: ['Data de nascimento, vencimento, emissão — qualquer data de formulário.'],
    avoid: ['Período (de… até): use o `AzuosDateRangeField`.'],
  },
  AzuosDatePicker: {
    summary:
      'A escolha de uma data num calendário em português. O valor entra e sai como texto ISO (2026-10-20).',
    use: ['Filtros e campos em que tocar no calendário é o caminho natural.'],
    avoid: ['Datas distantes (nascimento): use o `AzuosDateField`, que pergunta o ano primeiro.'],
  },
  AzuosDateRangeField: {
    summary:
      'O campo de período: de uma data até outra, com os campos "De" e "Até" digitáveis e dois calendários lado a lado. Só entrega o período no "Aplicar"; "Limpar" esvazia na hora.',
    use: ['Filtro de relatório, de histórico, de lista por data.'],
    avoid: ['Uma data só: use o `AzuosDateField`.'],
  },
  AzuosDateStepper: {
    summary:
      'A escolha de uma data em três perguntas: o ano, o mês e o dia. É o miolo do calendário do `AzuosDateField`.',
    use: ['Dentro de campos de data; raramente sozinho.'],
    avoid: ['Para o formulário, use o `AzuosDateField`, que já o traz.'],
  },
  AzuosFilterField: {
    summary:
      'Um filtro com o nome escrito em cima ("Situação", "Responsável"). Sem o nome, quatro controles lado a lado viram uma fileira de pastilhas sem sentido.',
    use: ['Em toda barra de filtros, envolvendo o controle.'],
    avoid: ['Em formulário: lá o rótulo vem do próprio campo (`AzuosTextField`, etc.).'],
  },
  AzuosFormComboboxField: {
    summary: 'O `AzuosComboboxField` com rótulo, dica e mensagem de erro, ligado ao formulário.',
    use: ['Combobox dentro de formulário validado.'],
    avoid: [
      'Fora de formulário (filtro): use o `AzuosComboboxField` dentro de um `AzuosFilterField`.',
    ],
  },
  AzuosFormSection: {
    summary:
      'Um bloco de formulário com título e, quando ele está travado, o motivo escrito. O travado não some: avisa por quê.',
    use: ['Formulários longos divididos em partes (Dados, Endereço, Contrato).'],
    avoid: ['Formulário curto, de até seis campos: dispensa seções.'],
  },
  AzuosFormSelectField: {
    summary: 'O `AzuosSelectField` com rótulo, dica e mensagem de erro, ligado ao formulário.',
    use: ['Seleção com poucas opções dentro de formulário validado.'],
    avoid: ['Mais de 15 opções: use o `AzuosFormComboboxField`.'],
  },
  AzuosIconPicker: {
    summary:
      'Escolher um ícone numa grade de prontos. Ícone se escolhe vendo, por isso são botões e não uma lista.',
    use: ['Ícone de categoria, de painel, de atalho.'],
    avoid: ['Para escolher cor: use o `AzuosColorSwatchField`.'],
  },
  AzuosInputGroup: {
    summary:
      'Um campo de texto com algo colado: um ícone ou prefixo na frente (R$, lupa) e uma unidade ou botão atrás (kg, copiar).',
    use: ['Busca com lupa, valores com unidade, campo com botão de copiar.'],
    avoid: ['Máscara de documento: use o `AzuosMaskedTextField`.'],
  },
  AzuosMaskedTextField: {
    summary:
      'O campo com máscara: CPF, CNPJ, CEP, CNAE, dinheiro, quantidade, CNH. Mesmo rótulo, régua e erro do `AzuosTextField`.',
    use: ['Todo documento e todo valor com formato fixo.'],
    avoid: ['Texto livre: use o `AzuosTextField`.'],
  },
  AzuosMonthPickerField: {
    summary: 'O campo de mês: rótulo, botão com os doze meses e erro, no formato AAAA-MM.',
    use: ['Competência, mês de referência, fechamento.'],
    avoid: ['Data com dia: use o `AzuosDateField`.'],
  },
  AzuosMultiSelectField: {
    summary:
      'Um select em que dá para marcar mais de uma opção, com o resumo do escolhido no próprio campo.',
    use: ['Filtros que se somam ("Lucro Real e Presumido").'],
    avoid: [
      'Escolha única: use o `AzuosSelectField`.',
      'Várias pessoas: use o `AzuosPersonMultiPickerField`.',
    ],
  },
  AzuosOptionPicker: {
    summary:
      'Seletor que muda de forma pela quantidade: com poucas opções, uma fileira de pastilhas; com muitas, um botão que abre a lista com busca.',
    use: ['Filtros e formulários em que o número de opções varia.'],
    avoid: ['Pessoa: use o `AzuosPersonPickerField`.'],
  },
  AzuosOtpField: {
    summary:
      'O código de seis números, uma caixa por dígito. Aceita colar o código inteiro de uma vez.',
    use: ['Confirmação por código enviado por e-mail ou SMS.'],
    avoid: ['Senha: não existe senha nos sistemas (a identidade vem do login do grupo).'],
  },
  AzuosPasswordStrengthMeter: {
    summary:
      'A barra de força de senha: quatro blocos e a lista do que falta. Informa, não tranca.',
    use: ['Só onde o sistema pede uma senha de serviço externo.'],
    avoid: ['Login de pessoa: é do login do grupo, nunca do sistema.'],
  },
  AzuosPersonMultiPickerField: {
    summary:
      'O campo de várias pessoas: a lista de quem tem acesso, com foto, e as escolhidas em chips.',
    use: ['Participantes, envolvidos, quem acompanha.'],
    avoid: ['Uma pessoa só: use o `AzuosPersonPickerField`.'],
  },
  AzuosPersonPickerField: {
    summary:
      'O único jeito de escolher alguém no sistema: a lista de quem tem acesso, com foto, guardando o id. Opção de pessoa montada à mão é recusada no CI.',
    use: ['Responsável, solicitante, aprovador.'],
    avoid: ['Várias pessoas: use o `AzuosPersonMultiPickerField`.'],
  },
  AzuosRichTextField: {
    summary:
      'Campo de texto com recursos a mais: dica embaixo, lupa com Enter para buscar e erro colado.',
    use: ['Busca principal de uma tela, campos com dica longa.'],
    avoid: ['Campo simples de formulário: use o `AzuosTextField`.'],
  },
  AzuosSegmentedControl: {
    summary:
      'Um grupo de botões em que só um fica ligado, para trocar o recorte de uma tela ("Meus" · "Equipe"). Pílula cinza com a opção escolhida em branco.',
    use: ['Recortes de uma mesma lista ou painel.'],
    avoid: ['Navegar entre telas: use o menu ou o `AzuosNavigationMenu`.'],
  },
  AzuosSelectField: {
    summary:
      'Campo de seleção de poucas opções, o mesmo em filtro e em formulário, com "nenhum" como opção de verdade.',
    use: ['Até 15 opções conhecidas (situação, regime, tipo).'],
    avoid: ['Mais de 15: use o `AzuosComboboxField`.', 'Pessoa: use o `AzuosPersonPickerField`.'],
  },
  AzuosSliderField: {
    summary: 'Um controle deslizante com nome, para escolher um valor numa faixa.',
    use: ['Valores aproximados (raio de busca, limite de alerta).'],
    avoid: ['Valor exato (dinheiro, quantidade): use o `AzuosMaskedTextField`.'],
  },
  AzuosSubmitButton: {
    summary:
      'O botão que envia o formulário. Desabilita enquanto envia, para dois cliques não virarem dois registros.',
    use: ['O botão final de todo formulário.'],
    avoid: ['Ações fora de formulário: use o `AzuosActionButton`.'],
  },
  AzuosSuggestionTextField: {
    summary:
      'Campo de texto com as opções já cadastradas embaixo (Departamento, Cargo): sugere, mas aceita texto novo.',
    use: ['Campos que repetem valores mas não têm cadastro próprio.'],
    avoid: ['Lista fechada: use o `AzuosSelectField` ou o `AzuosComboboxField`.'],
  },
  AzuosTextAreaField: {
    summary: 'Um campo de texto longo: rótulo, área que cresce e erro colado.',
    use: ['Observações, descrições, justificativas.'],
    avoid: ['Uma linha só: use o `AzuosTextField`.'],
  },
  AzuosTextField: {
    summary:
      'O campo de formulário: rótulo, entrada cinza sem contorno e o erro colado logo abaixo, onde a pessoa está olhando.',
    use: ['Todo texto de uma linha.'],
    avoid: ['Documento ou valor com formato: use o `AzuosMaskedTextField`.'],
  },

  /* ------------------------------------------------------------------ Cards */
  AzuosCardSurface: {
    summary:
      'A superfície de todo card: branca (grafite no escuro), sem borda, com o fio de 1px e a sombra difusa. Clicável, sobe 2px no hover; escolhida, fica azul com texto branco.',
    use: [
      'Por baixo de todo formato de card (já vem neles).',
      'Card novo de feature, quando nenhum formato serve.',
    ],
    avoid: [
      'Montar card à mão com `bg-card border`: é recusado no check de design (`mise run design:check`).',
    ],
  },
  AzuosContentCard: {
    summary:
      'O card de conteúdo: uma empresa, uma auditoria, qualquer coisa com título e detalhes, com o ícone do assunto.',
    use: ['Grades de registros (empresas, contratos, processos).'],
    avoid: ['Número de painel: use o `AzuosStatCard`.'],
  },
  AzuosContentStatCard: {
    summary:
      'O número dentro do card de conteúdo: o mesmo card da empresa, com uma contagem em destaque.',
    use: ['Resumo por categoria dentro de uma grade de conteúdo.'],
    avoid: ['Painel de indicadores: use o `AzuosStatCard`.'],
  },
  AzuosHeroCard: {
    summary: 'O cartão de destaque, sólido, no topo de uma tela: título grande, frase e ações.',
    use: ['Abertura de painel e de áreas importantes.'],
    avoid: ['Mais de um por tela.'],
  },
  AzuosMiniStatCard: {
    summary:
      'O filtro pequeno: uma contagem por status com a bolinha do tom, clicável para filtrar a lista.',
    use: ['Fileira de status em cima de uma lista.'],
    avoid: ['Indicador principal da tela: use o `AzuosStatCard`.'],
  },
  AzuosPanelCard: {
    summary:
      'A casca de um bloco de painel: título, uma linha de explicação e o conteúdo, sobre a superfície sem borda.',
    use: ['Gráficos, tabelas curtas e listas dentro de um painel.'],
    avoid: ['Card de registro clicável: use o `AzuosContentCard`.'],
  },
  AzuosPersonScoreCard: {
    summary:
      'O card de uma pessoa com placar: o rosto, o anel de uma porcentagem e as contagens que pedem ação.',
    use: ['Carteira por responsável, desempenho da equipe.'],
    avoid: ['Lista simples de pessoas: use o `AzuosPersonAvatar` numa tabela.'],
  },
  AzuosStatCard: {
    summary:
      'O card de painel: o número que se lê de relance, com o ícone cheio na cor do assunto e o rótulo em frase. Clicável, vira filtro.',
    use: ['Indicadores no topo de painéis e listas.'],
    avoid: ['Contagem pequena de status: use o `AzuosMiniStatCard`.'],
  },
  AzuosStatCardGrid: {
    summary:
      'A fileira de cards do topo do painel, com o número de colunas certo para cada largura de tela.',
    use: ['Sempre que houver dois ou mais `AzuosStatCard` juntos.'],
    avoid: ['Grade de conteúdo: use a utilidade `card-grid`.'],
  },
  AzuosToneCard: {
    summary:
      'O card de uso geral com tom, sobre a `AzuosCardSurface`: hover com o véu leve no tom quando interativo.',
    use: ['Cards de feature que precisam de um tom e não se encaixam nos outros formatos.'],
    avoid: ['Indicador: use o `AzuosStatCard`. Registro: use o `AzuosContentCard`.'],
  },

  /* ------------------------------------------------------------------ Gráficos e números */
  AzuosAreaChart: {
    summary:
      'Área: o volume de alguma coisa ao longo do tempo — quando subiu e por quanto tempo ficou lá.',
    use: ['Evolução diária ou mensal de uma quantidade.'],
    avoid: ['Comparar categorias: use o `AzuosColumnChart`.'],
  },
  AzuosCalendarChart: {
    summary: 'Calendário de calor: quantas coisas caem em cada dia, mês a mês. O gráfico do pico.',
    use: ['Vencimentos, renovações, picos sazonais.'],
    avoid: ['Tendência contínua: use o `AzuosAreaChart`.'],
  },
  AzuosChartLegend: {
    summary: 'A legenda de um gráfico de várias séries: o nome escrito ao lado da cor.',
    use: ['Todo gráfico com mais de uma série.'],
    avoid: ['Gráfico de uma série só: legenda é ruído.'],
  },
  AzuosChartValueList: {
    summary:
      'Os valores de um gráfico em texto, só para leitor de tela. Sem ela, o gráfico é invisível para quem não enxerga.',
    use: ['Junto de todo gráfico (os gráficos da casa já trazem).'],
    avoid: ['Mostrar valores na tela: use uma tabela.'],
  },
  AzuosColumnChart: {
    summary: 'Colunas para comparar quantidades entre categorias (por responsável, por status).',
    use: ['Até 12 categorias com uma série.'],
    avoid: ['Muitas categorias de tamanhos variados: use o `AzuosTreemapChart`.'],
  },
  AzuosDonutChart: {
    summary: 'Rosca: como um todo se divide, com legenda clicável e o total no meio.',
    use: ['Situação, categoria ou cidade, com até seis fatias.'],
    avoid: ['Fatias quase iguais: use o `AzuosStackedBarChart`.'],
  },
  AzuosEchart: {
    summary:
      'A moldura de todo gráfico: monta o ECharts com as cores, fontes e tamanhos da casa, no claro e no escuro.',
    use: ['Por baixo de todo gráfico do sistema.'],
    avoid: ['Montar ECharts direto na tela.'],
  },
  AzuosHeatmapChart: {
    summary: 'Mapa de calor: o cruzamento de duas dimensões. O gráfico do gargalo.',
    use: ['Quem está com mais coisa parada em qual etapa.'],
    avoid: ['Uma dimensão só: use o `AzuosColumnChart`.'],
  },
  AzuosProgressBar: {
    summary: 'Quanto já foi feito, numa barra e num número — cheio é bom.',
    use: ['Andamento de uma meta, de um checklist.'],
    avoid: ['Consumo de capacidade (cheio é ruim): use o `AzuosUsageMeter`.'],
  },
  AzuosProgressRing: {
    summary: 'O andamento geral num anel, com o percentual no meio.',
    use: ['Dentro de cards, como o número principal de andamento.'],
    avoid: ['Comparar vários andamentos: use barras.'],
  },
  AzuosRadarChart: {
    summary: 'Radar: o perfil de um conjunto de categorias de uma vez.',
    use: ['Onde um time ou processo trava, comparando o formato.'],
    avoid: ['Ranking: use o `AzuosColumnChart`.'],
  },
  AzuosRadialChart: {
    summary: 'Medidor radial: um número só, contra o quanto ele poderia ser.',
    use: ['"Quanto de 100" — meta, cota, ocupação.'],
    avoid: ['Comparar categorias.'],
  },
  AzuosSankeyChart: {
    summary: 'Fluxo: para onde o volume vai, etapa por etapa.',
    use: ['De onde vem e onde trava (tipo → responsável → situação).'],
    avoid: ['Poucas categorias sem etapas: use a rosca.'],
  },
  AzuosStackedBarChart: {
    summary: 'Barra empilhada deitada: o tamanho de cada categoria e do que ela é feita.',
    use: ['Comparar composições entre categorias.'],
    avoid: ['Uma composição só: use a rosca.'],
  },
  AzuosTreemapChart: {
    summary: 'Treemap: muitas categorias de tamanhos muito diferentes num quadro só.',
    use: ['Cauda longa (cidades, tipos de documento).'],
    avoid: ['Até 12 categorias: use o `AzuosColumnChart`.'],
  },
  AzuosUsageMeter: {
    summary: 'Quanto de uma capacidade já foi consumido — aqui cheio é ruim, e a cor avisa.',
    use: ['Disco, cota, limite de plano.'],
    avoid: ['Andamento de tarefa: use o `AzuosProgressBar`.'],
  },

  /* ------------------------------------------------------------------ Listas e tabelas */
  AzuosAttachmentList: {
    summary: 'A lista de arquivos de um registro, com abrir, baixar e, quando permitido, excluir.',
    use: ['Anexos de um registro.'],
    avoid: ['Escolher arquivos para enviar: use o `AzuosAttachmentPicker`.'],
  },
  AzuosInfiniteScrollFooter: {
    summary:
      'O fim da lista que rola: pede a próxima página ao chegar perto e mantém o "Carregar mais" para quem usa teclado ou leitor de tela.',
    use: ['Rodapé das listas em tabela.'],
    avoid: ['Grade de cards: ela pagina com o `AzuosPaginationBar`.'],
  },
  AzuosKanbanColumn: {
    summary:
      'Uma coluna de quadro, no desenho do paralegal: o cabeçalho na cor e no ícone da etapa (com a contagem e o lápis quando dá para editar), os cartões rolando por dentro e o "Adicionar" no fim. Com `ui.dropId`, é uma área de soltar do `@dnd-kit` e acende quando um cartão passa por cima.',
    use: ['Quadros de tarefas, de etapas, de funil.'],
    avoid: ['Lista simples: use a tabela.', 'Cor da etapa em borda ou no fundo da coluna: a cor fica só no cabeçalho.'],
  },
  AzuosPaginationBar: {
    summary:
      'A barra de página de uma grade: quantos existem ao todo, onde a pessoa está e como ir para outra página.',
    use: ['Toda grade de cards (regra da casa).'],
    avoid: ['Tabela: ela rola sem fim.'],
  },
  AzuosTable: {
    summary:
      'A tabela da casa: sobre a superfície sem borda, com cabeçalho em frase e rodapé opcional para a fonte do dado.',
    use: ['Listas longas e densas, com rolagem contínua.'],
    avoid: ['Poucos registros ricos em detalhe: use cards.'],
  },
  AzuosTableViewToggle: {
    summary:
      'Tabela ou cartões, ao lado de cada lista que tem os dois formatos, guardando a preferência da pessoa.',
    use: ['Toda lista com os dois modos.'],
    avoid: ['Lista de um formato só.'],
  },

  /* ------------------------------------------------------------------ Conteúdo e marcadores */
  AzuosArchivedList: {
    summary:
      'O que foi removido e pode voltar. Nada se apaga no sistema: remover arquiva, e é aqui que se restaura.',
    use: ['Fim de listas e de registros com itens removidos.'],
    avoid: ['Lixeira definitiva: não existe.'],
  },
  AzuosCarousel: {
    summary: 'Uma faixa que desliza para o lado, arrastando ou pelas setas.',
    use: ['Fileira que não cabe numa linha (atalhos, destaques).'],
    avoid: ['Conteúdo importante: o que fica escondido à direita não é visto.'],
  },
  AzuosCollapsible: {
    summary: 'Um bloco que abre e fecha: o título sempre à vista, o conteúdo quando a pessoa pede.',
    use: ['Detalhes secundários, perguntas frequentes.'],
    avoid: ['Esconder campo obrigatório de formulário.'],
  },
  AzuosExpandableScreen: {
    summary:
      'A tela que se expande para o trabalho que não cabe num diálogo: montar um filtro em árvore, editar um painel.',
    use: ['Editores grandes.'],
    avoid: ['Confirmação ou formulário curto: use um diálogo.'],
  },
  AzuosHistoryTimeline: {
    summary:
      'A linha do tempo de um chamado: cada histórico com quem, quando, o quê e de que tipo, o tempo gasto quando vem, e o histórico que encerra dito em palavras ("Encerrou o chamado"), não só pela cor.',
    use: [
      'A ficha do chamado no painel.',
      'A consulta pública por protocolo, que manda a versão podada (sem tempo gasto nem visibilidade).',
    ],
    avoid: [
      'Etapas de um processo: use o `AzuosTimeline`.',
      'Linha do tempo de um item do inventário: use o `AzuosInventoryItemTimeline`.',
    ],
  },
  AzuosLoadingState: {
    summary:
      '"Carregando…" dizendo o quê: numa tela com várias partes, a pessoa sabe o que espera.',
    use: ['Enquanto uma parte da tela busca dados.'],
    avoid: ['Listas e tabelas: prefira esqueletos do tamanho real da linha.'],
  },
  AzuosPersonAvatar: {
    summary: 'A pessoa em duas letras (ou na foto): o olho acha "MR" antes de ler o nome.',
    use: ['Responsável em linhas, cards e chips.'],
    avoid: ['Perfil completo: use o `AzuosMyProfileView`.'],
  },
  AzuosSectionTitle: {
    summary:
      'O título de uma seção de card: ícone em quadrado arredondado, título e uma linha de explicação.',
    use: ['Seções de perfil e de formulários longos.'],
    avoid: ['Título de tela: use o `AzuosPageHeader`.'],
  },
  AzuosStatusBadge: {
    summary:
      'Um selo de situação: texto curto em pílula, com fundo claro do tom e texto do tom. O tom vem do domínio.',
    use: ['Situação de um registro em lista, card e cabeçalho.'],
    avoid: ['Contagem: use o `AzuosMiniStatCard`.'],
  },
  AzuosTimeline: {
    summary: 'A casca de uma lista de etapas: troca campos soltos por uma narrativa em ordem.',
    use: ['Etapas de um processo ou de um formulário em passos, com `AzuosTimelineStep` dentro.'],
    avoid: ['Histórico de um chamado: use o `AzuosHistoryTimeline`.'],
  },
  AzuosTimelineStep: {
    summary: 'Uma etapa dentro do `AzuosTimeline`, com ícone no tom do estado.',
    use: ['Sempre dentro de um `AzuosTimeline`.'],
    avoid: ['Sozinha.'],
  },
  AzuosTooltip: {
    summary: 'A dica ao passar o mouse ou focar com o teclado.',
    use: ['Texto cortado, ícone sem rótulo.'],
    avoid: ['Informação essencial: ela precisa estar na tela.'],
  },
  AzuosTruncatedText: {
    summary: 'Um texto que pode não caber: cortado com "…" e inteiro no balão, só quando cortou.',
    use: ['Nomes longos em colunas e cards.'],
    avoid: ['Parágrafos: deixe quebrar a linha.'],
  },

  /* ------------------------------------------------------------------ Diálogos */
  AzuosAvatarCropperDialog: {
    summary: 'O editor da foto de perfil: cortar, aproximar e girar antes de enviar.',
    use: ['Troca de foto de pessoa.'],
    avoid: ['Anexo comum: use o `AzuosAttachmentPicker`.'],
  },
  AzuosConfirmDialog: {
    summary:
      'A pergunta antes do que não tem volta. O botão diz o verbo ("Excluir chamado"), a recusa do servidor aparece dentro do diálogo, e enquanto confirma ele não fecha.',
    use: ['Excluir, arquivar, enviar.', 'Tom `danger` para o que apaga; `primary` para o resto.'],
    avoid: ['Ação que se desfaz: prefira um aviso com "Desfazer".'],
  },
  AzuosResponsiveDialogContent: {
    summary:
      'O diálogo que, no celular, nasce de baixo com a alça de arrastar; no computador, é o diálogo central.',
    use: ['Todo diálogo que precisa funcionar bem no celular.'],
    avoid: ['Editor grande: use o `AzuosExpandableScreen`.'],
  },
  AzuosTaskFormDialog: {
    summary:
      'O formulário de criar e editar tarefa, num diálogo — o molde de todo formulário em diálogo.',
    use: ['Referência para formulários de feature em diálogo.'],
    avoid: ['Formulário longo: use uma tela própria.'],
  },

  /* ------------------------------------------------------------------ Notificações */
  AzuosNotificationBell: {
    summary: 'O sininho da casca: quantas não lidas, e um clique abre a lista curta delas.',
    use: ['Já vem na casca padrão.'],
    avoid: ['Repetir em outra parte da tela.'],
  },
  AzuosNotificationCard: {
    summary: 'Uma notificação, a mesma leitura no sininho, no histórico e no diálogo.',
    use: ['Listas de notificações.'],
    avoid: ['Aviso de ação concluída: use o `AzuosToaster`.'],
  },
  AzuosNotificationDialog: {
    summary: 'O diálogo de entrada com todas as não lidas juntas, uma vez por sessão.',
    use: ['Abertura do sistema com notificações pendentes.'],
    avoid: ['Notificação que chega durante o uso: vira aviso no canto.'],
  },
  AzuosToaster: {
    summary:
      'Os avisos de rodapé: uma frase curta sobre o que acabou de acontecer, no canto de baixo.',
    use: ['"Salvo.", "Enviado.", erros de ação.'],
    avoid: ['Erro que impede a tela: use o `AzuosErrorState`.'],
  },

  /* ------------------------------------------------------------------ Estados da tela */
  AzuosAppErrorBoundary: {
    summary:
      'Nenhum erro derruba a tela em silêncio: no lugar da página em branco, "A tela não carregou", a mensagem do erro e o botão Recarregar.',
    use: ['Já envolve o app inteiro.'],
    avoid: ['Erro de uma busca: use o `AzuosErrorState`.'],
  },
  AzuosEmptyState: {
    summary:
      'A lista vazia com o que fazer a respeito. Vazio não é erro: o ícone (a caixa de entrada, se nenhum for passado), o título, a explicação e, quando houver, a ação sugerida.',
    use: ['Lista sem itens, filtro sem resultado.'],
    avoid: ['Falha de carregamento: use o `AzuosErrorState`.'],
  },
  AzuosErrorState: {
    summary: 'A falha com o motivo escrito e o "Tentar de novo" — nunca um "algo deu errado".',
    use: ['Quando uma busca de dados falha.'],
    avoid: ['Erro de campo: ele fica colado no campo.'],
  },
  AzuosPendingArea: {
    summary: 'A tela de uma área ainda não construída, para o menu não mentir.',
    use: ['Itens de menu de partes que ainda virão.'],
    avoid: ['Esconder uma tela quebrada.'],
  },

  /* ------------------------------------------------------------------ Navegação e estrutura */
  AzuosAppShell: {
    summary:
      'A casca padrão do grupo: menu lateral (uma coluna, ou duas com o trilho de módulos), atalhos, Zuzu, perfil e Sair; no celular, a barra de baixo com 3 itens + ☰. Igual nos 13 sistemas e travada.',
    use: [
      'Em volta de todo o app (já vem). Tela nova no menu é uma linha em `lib/navigation/navigation.ts`.',
    ],
    avoid: ['Mudar por sistema: só quem administra muda, nos 13 de uma vez.'],
  },
  AzuosAppShellAvatar: {
    summary: 'A foto de quem está usando, na casca. Sem foto, as iniciais.',
    use: ['Já vem na casca.'],
    avoid: ['Fora da casca: use o `AzuosPersonAvatar`.'],
  },
  AzuosAppShellMobileBar: {
    summary: 'O menu da casca no celular: uma barra fixa embaixo, ao alcance do polegar.',
    use: ['Já vem na casca.'],
    avoid: ['Recriar navegação inferior em tela.'],
  },
  AzuosAppShellNavEntry: {
    summary: 'Um item do menu com ícone e rótulo, na casca padrão.',
    use: ['Já vem na casca.'],
    avoid: ['Menus dentro de tela: use o `AzuosNavigationMenu`.'],
  },
  AzuosAppShellTargetLink: {
    summary: 'O link de um atalho da casca: rota interna ou endereço de fora em nova aba.',
    use: ['Já vem na casca.'],
    avoid: ['Links comuns de tela.'],
  },
  AzuosBackButton: {
    summary:
      'O voltar canônico: "← Voltar para [destino]", texto na cor principal, sem moldura. Botão de voltar feito à mão é recusado.',
    use: ['Topo de toda tela de detalhe, formulário ou entidade.'],
    avoid: ['Navegar para frente: use links e botões.'],
  },
  AzuosBrandMark: {
    summary:
      'A marca a partir dos arquivos oficiais da CDN: a logo branca (`full`) e o símbolo branco (`icon`) sobre a barra azul, e o ícone de app (`tile`) nas telas de fundo claro.',
    use: ['Casca, telas de entrada, documentos.'],
    avoid: ['Logo branca sobre fundo claro: use o `tile`.', 'Redesenhar a marca.'],
  },
  AzuosBreadcrumb: {
    summary:
      'A trilha de onde a pessoa está: "Computadores › Estação 12 › Histórico". O último item é a página atual e nunca é link.',
    use: ['Telas com três níveis ou mais.'],
    avoid: ['Telas de primeiro nível: o título basta.'],
  },
  AzuosIdentityOverview: {
    summary: 'O resumo da identidade de quem está usando: nome, e-mail, acessos.',
    use: ['Telas de perfil e de conta.'],
    avoid: ['Lista de pessoas.'],
  },
  AzuosMyProfileView: {
    summary:
      'Meu perfil: a mesma ficha nos 13 sistemas, com foto, fatos de relance, seções com índice e o tema — sem campo de texto (quem edita a conta é o admin-console).',
    use: [
      'A tela "Meu perfil" (já vem).',
      'O que é só do Chamados (módulos, WhatsApp, efeitos) entra pelos encaixes, depois das seções padrão.',
    ],
    avoid: ['Mudar a forma da ficha: é travada, e o pedido vai para o suporte.'],
  },
  AzuosNavigationMenu: {
    summary:
      'Uma fileira de links de seção para navegar dentro de uma tela (Visão geral · Histórico · Anexos).',
    use: ['Telas de detalhe com várias partes.'],
    avoid: ['Trocar recorte de lista: use o `AzuosSegmentedControl`.'],
  },
  AzuosPageHeader: {
    summary: 'O título da tela e as ações dela, numa fileira só, com o `<h1>` de verdade.',
    use: ['Topo de toda tela.'],
    avoid: ['Título de card: use o `AzuosSectionTitle`.'],
  },

  /* ------------------------------------------------------------------ Preferências */
  AzuosEffectsToggle: {
    summary:
      'Efeitos visuais completos ou leves, para máquinas lentas. O sistema já escolhe sozinho; o botão é para quem quer forçar. Guarda a preferência sozinho.',
    use: ['Preferências da tela "Meu perfil" (já vem).'],
    avoid: ['Configurar animação por tela.'],
  },
  AzuosThemeToggle: {
    summary:
      'O botão de trocar entre claro e escuro (o grafite), sobre a barra azul ou sobre a superfície (`ui.variant`). Cuida do próprio tema, sem a tela passar estado.',
    use: ['Um canto de menu ou de barra que precise trocar o tema.'],
    avoid: [
      'Na tela "Meu perfil": a ficha já traz o tema.',
      'Criar outros temas: o padrão Apple é um só.',
    ],
  },

  /* ------------------------------------------------------------------ Mascote */
  AzuosZuzu: {
    summary:
      'O Zuzu, a arara mascote da casa, nas poses oficiais da marca. Parado por padrão (`anim: none`); os movimentos herdados do paralegal param sozinhos para quem pediu menos movimento.',
    use: ['Hero de painel, estados vazios, avisos de "falta isto".'],
    avoid: [
      'Enfeite de canto, animação, giro ou escala — o check de design (`mise run design:check`) recusa.',
    ],
  },
  /* ------------------------------------------------------------------ Dashboard e telas */
  AzuosAgendaCalendar: {
    summary:
      'A agenda do painel: meses lado a lado com quantos itens caem em cada dia da janela (vencimentos, movimentos).',
    use: ['Bloco de agenda do dashboard.'],
    avoid: ['Escolher uma data: use o `AzuosDateField`.'],
  },
  AzuosBoardCanvas: {
    summary:
      'A grade de quatro colunas do dashboard onde os blocos se encaixam. Vendo, nada se mexe; editando, arrasta e redimensiona.',
    use: ['Dentro do `AzuosBoardView` (o motor do dashboard é do suporte).'],
    avoid: ['Montar painel fixo à mão numa tela.'],
  },
  AzuosBoardFilterBar: {
    summary:
      'Os filtros do painel, no estilo do Grafana: uma faixa acima dos blocos que recorta todos de uma vez, e o seletor de Período no canto de cima (`ui.part`). O valor é de quem vê e não se grava.',
    use: ['Topo de todo dashboard (já vem no `AzuosBoardView`).'],
    avoid: ['Filtro de um bloco só: ele fica na edição do bloco.'],
  },
  AzuosBoardStudio: {
    summary:
      'Montar o painel numa tela cheia por cima de tudo: o tabuleiro à esquerda e os tipos de bloco à direita, para arrastar. No Chamados, nenhuma tela o usa hoje.',
    use: ['Só se uma tela precisar montar o painel fora do próprio painel.'],
    avoid: ['"Editar painel" do dashboard: o `AzuosBoardView` monta no próprio painel.'],
  },
  AzuosBoardView: {
    summary:
      'O dashboard no formato do Grafana: as abas dos painéis (Equipe, Gestor, Pessoal), o seletor de tempo, os filtros e os blocos. "Editar painel" monta ali mesmo, num rascunho que só "Salvar painel" grava.',
    use: ['A tela Dashboard de cada módulo (já vem; o projeto muda só as fontes de dados).'],
    avoid: ['Recriar dashboard por sistema.'],
  },
  AzuosBoardWidget: {
    summary:
      'Um bloco do dashboard: a fonte contada, no formato escolhido, igual para ver e editar.',
    use: ['Dentro do `AzuosBoardCanvas`.'],
    avoid: ['Card de número fora do dashboard: use o `AzuosStatCard`.'],
  },
  AzuosDashboardHeroCard: {
    summary:
      'O hero do painel com o Zuzu, em fundo azul-escuro: a frase do momento e os números principais em cards, com o ícone cheio de cada tom. Número com clique leva à lista dele.',
    use: ['O bloco "hero" do dashboard.'],
    avoid: ['Mais de um por tela.'],
  },
  AzuosFilterBuilderScreen: {
    summary:
      'O montador de filtro em tela expandida: os filtros salvos à esquerda e o canvas do filtro à direita.',
    use: ['Criar e editar filtros salvos do painel.'],
    avoid: ['Filtro rápido de lista: use a barra de filtros da tela.'],
  },
  AzuosHistoryView: {
    summary:
      'A tela Histórico: quem cadastrou, alterou, concluiu ou arquivou o quê, e quando, campo a campo.',
    use: ['A tela Histórico (já vem, última no menu).'],
    avoid: ['Histórico de um registro só: use o `AzuosHistoryTimeline`.'],
  },
  AzuosNotificationHistoryView: {
    summary: 'O histórico de notificações no perfil, com o "Ver todas" em diálogo.',
    use: ['Ficha do perfil (já vem).'],
    avoid: ['Lista curta do sininho: é o `AzuosNotificationBell`.'],
  },
  AzuosNotificationSettingsView: {
    summary: 'O que notificar, do administrador: cada assunto ligado ou não, e com que nível.',
    use: ['Configuração de notificações do sistema.'],
    avoid: ['Preferência pessoal de tema ou efeitos.'],
  },
  AzuosTaskListView: {
    summary:
      'A tela de Tarefas, a feature de exemplo do template e o molde de toda tela de lista: cabeçalho, resumo, filtros, lista e estados.',
    use: ['Como referência ao criar qualquer tela de lista.'],
    avoid: ['Copiar sem adaptar o domínio.'],
  },
  AzuosWidgetChart: {
    summary:
      'Um dos gráficos a mais do painel, desenhado na moldura de todo gráfico (`AzuosEchart`).',
    use: ['Dentro de um bloco do dashboard.'],
    avoid: ['Gráfico de tela: use os componentes de Gráficos e números.'],
  },
  AzuosWidgetEditorDialog: {
    summary:
      'O bloco aberto para editar, numa tela cheia no formato do Grafana: a pré-visualização em tempo real em cima, a consulta (fonte, agrupar, período, filtro) embaixo e o tipo de gráfico e o título na lateral.',
    use: ['Editar ou criar um bloco no "Editar painel".'],
    avoid: ['Fora do dashboard.'],
  },
  /* ------------------------------------------------------------------ Chamados — componentes do sistema (painel, filtros, cadastros) */
  AzuosAgentDownloadView: {
    summary:
      'A tela "Agente Windows", igual na Infra e no Sistema: a versão LTS com o botão de baixar o instalador, o passo a passo da primeira instalação (pacote .zip, certificado e scripts) e a lista de todas as versões, cada uma com o MSI, o certificado e o script.',
    use: ['Na página do agente de cada módulo (já vem nas duas).'],
    avoid: [
      'Para ver as máquinas que já têm o agente: é a tela de Computadores (`AzuosComputerListView`).',
      'Para baixar um anexo comum: use o `AzuosFileLinks`.',
    ],
  },
  AzuosBoardDrillBanner: {
    summary:
      'A faixa do recorte do Painel, presa no alto da tela aberta por um clique num item do Painel: diz de onde a lista veio (bloco, item, período), leva de volta ao Painel e oferece o "Limpar recorte". Com `notice`, vira o aviso de que o recorte não valeu.',
    use: ['No alto de toda tela de lista que o Painel abre com um recorte.'],
    avoid: [
      'Para mostrar os filtros da própria tela: são as etiquetas do `FilterPanel`.',
      'Aviso de erro da tela: use o `AzuosErrorState`.',
    ],
  },
  AzuosBoardPanelMenu: {
    summary:
      'O menu de três pontinhos no título de um bloco do painel, como o do Grafana: Ver (o bloco na tela cheia), Editar, Duplicar e Remover. Quem só vê o painel tem só o "Ver".',
    use: ['No canto de cada bloco do dashboard (já vem no `AzuosBoardWidget`).'],
    avoid: [
      'Menu de ações de uma linha de lista ou de um cadastro: use o `AzuosActionMenu`.',
      'Fora do dashboard.',
    ],
  },
  AzuosComputerFormDialog: {
    summary:
      'O modal de cadastrar máquina e de corrigir a identificação dela: nome, tipo, nome do dispositivo, responsável (só uma pessoa da lista do escritório, pelo campo de pessoa com foto — nunca um nome digitado), só o departamento oficial do RH (guardado pelo id, sem os fixos daqui) e observação — onde ficaram, nas linhas "… anterior:", o responsável e o local antigos. O nome da máquina só se edita no cadastro; depois quem o informa é o agente.',
    use: ['Cadastrar ou corrigir uma máquina do inventário da Infra.'],
    avoid: [
      'Transferir a máquina de pessoa ou de lugar: use o `AzuosTransferDialog`.',
      'Bloquear ou descartar a máquina: use o `AzuosComputerBlockDialog` ou o `AzuosComputerDisposalDialog`.',
    ],
  },
  AzuosFilterChoice: {
    summary:
      'Um filtro com as opções à vista, no lugar da lista suspensa, em três desenhos: etiquetas lado a lado, lista aberta (uma por linha, com o visto) ou só as fotos, para filtro de pessoa. Clicar na escolhida não desmarca: quem limpa é a opção "Todos".',
    use: [
      'Filtro do painel com poucas opções, quando esconder as opções numa lista atrapalharia.',
      'Filtro de pessoa com poucas pessoas, mostrado pelos rostos.',
    ],
    avoid: [
      'Muitas opções: use o `AzuosOptionPicker`, com busca.',
      'Escolha de formulário: use o `AzuosSegmentedControl` ou o `AzuosSelectField`.',
    ],
  },
  AzuosFilterGroupEditor: {
    summary:
      'Um grupo "E/OU" do construtor de filtros: o jeito de juntar as condições, as condições (campo, como comparar, valor) e, dentro, outros grupos, até o limite de níveis. A árvore inteira sobe a cada mudança.',
    use: ['Dentro do `AzuosFilterBuilderScreen` (já vem nele).'],
    avoid: [
      'Filtro simples de lista: use o `FilterPanel`.',
      'Filtro do painel à vista: use o `AzuosFilterChoice`.',
    ],
  },
  FilterPanel: {
    summary:
      'A barra de filtros de uma lista, o mesmo desenho no Inventário e nas filas de chamados: a busca, um filtro principal e o botão "Filtros" com a contagem; o resto num painel que abre com pastilhas e listas suspensas em grade, e uma etiqueta com X por filtro ligado, mais o "Limpar filtros".',
    use: [
      'No alto de toda lista com busca e vários filtros.',
      'Com `ui.showViewToggle`, quando a lista alterna entre tabela e cards.',
    ],
    avoid: [
      'Filtro do dashboard: use o `AzuosBoardFilterBar`.',
      'Condições combinadas com E/OU: use o `AzuosFilterBuilderScreen`.',
    ],
  },
  AzuosInventoryFormDialog: {
    summary:
      'O modal de cadastrar e corrigir um produto do inventário da Manutenção: nome, categoria, unidade, onde fica, departamento, pessoa, código, observação e a foto (câmera do celular, arquivo ou Ctrl+V). Na edição, ganha a aba "Linha do tempo" com as ocorrências do produto.',
    use: ['Cadastrar ou corrigir um produto do inventário.'],
    avoid: [
      'Entrada, saída ou descarte de quantidade: use o `AzuosInventoryMovementDialog`.',
      'Peça de computador da Infra: use o `AzuosPartFormDialog`.',
    ],
  },
  AzuosInventoryItemTimeline: {
    summary:
      'A linha do tempo de um produto do inventário: as ocorrências registradas, com tipo, descrição e data, e o formulário de "Registrar ocorrência" no alto. Com `ui.readOnly`, só a lista.',
    use: ['Na aba "Linha do tempo" do `AzuosInventoryFormDialog` (já vem nele).'],
    avoid: [
      'Linha do tempo de um chamado: use o `AzuosHistoryTimeline`.',
      'Etapas de um processo: use o `AzuosTimeline`.',
    ],
  },
  AzuosInventoryMovementDialog: {
    summary:
      'O modal de entrada, saída ou descarte de um produto do depósito da Manutenção. O tipo vem do botão que abriu e aparece no título; o produto vem escolhido ou é escolhido ali; o saldo atual fica à vista. No descarte, pede o motivo.',
    use: [
      'Os botões de Entrada e Saída do Depósito.',
      'O registro de descarte, na tela de Descarte.',
    ],
    avoid: [
      'Corrigir o cadastro do produto: use o `AzuosInventoryFormDialog`.',
      'Peça de computador da Infra: use o `AzuosMovementFormDialog`.',
    ],
  },
  AzuosMaintenanceFormDialog: {
    summary:
      'O modal de registrar e corrigir uma manutenção da Infra: a máquina (ou um equipamento fora do inventário, digitado), o tipo, o que foi feito, quem fez e quando.',
    use: ['Registrar ou corrigir uma manutenção já feita.'],
    avoid: [
      'Agendar a próxima preventiva: use o `AzuosMaintenanceScheduleDialog`.',
      'Movimentar peça usada no serviço: use o `AzuosMovementFormDialog`.',
    ],
  },
  AzuosMovementFormDialog: {
    summary:
      'O modal de entrada ou saída de uma peça da Infra. O tipo vem do botão e aparece no título; o saldo atual fica à vista. Pede a quantidade, a máquina (opcional — ligada, a peça aparece na ficha dela), quem movimentou e uma observação.',
    use: ['Os botões de Entrada e Saída da tela de Peças.'],
    avoid: [
      'Cadastrar ou corrigir a peça: use o `AzuosPartFormDialog`.',
      'Produto do depósito da Manutenção: use o `AzuosInventoryMovementDialog`.',
    ],
  },
  AzuosPartFormDialog: {
    summary:
      'O modal de cadastrar e corrigir uma peça da Infra: o que é, categoria, estado e, só no cadastro, quantas existem hoje. Depois, o saldo só muda por entrada e saída, para tudo ficar no extrato.',
    use: ['Cadastrar ou corrigir uma peça.'],
    avoid: [
      'Mudar a quantidade: use o `AzuosMovementFormDialog`.',
      'Produto do inventário da Manutenção: use o `AzuosInventoryFormDialog`.',
    ],
  },
  AzuosPeoplePicker: {
    summary:
      'O seletor de várias pessoas por id, nascido para as pessoas vinculadas de um chamado: busca no balão, marca quantas quiser, e as escolhidas ficam como fichas embaixo, com o X para tirar. O gatilho resume ("Ana e mais 2"); quem saiu da lista aparece como "Pessoa removida".',
    use: ['Vincular pessoas a um chamado: na abertura, na Central e no painel.'],
    avoid: [
      'Uma pessoa só: use o `AzuosPersonPickerField`.',
      'Várias pessoas num formulário comum: use o `AzuosPersonMultiPickerField`.',
    ],
  },
  AzuosQuoteFormDialog: {
    summary:
      'O modal de guardar e corrigir um orçamento feito com uma empresa de fora: empresa, o que foi orçado, tipo, valor, data, situação, observação e o documento (PDF ou imagem, também com Ctrl+V), com erro próprio que não apaga o que foi digitado.',
    use: ['Cadastrar ou corrigir um orçamento da Manutenção.'],
    avoid: ['Para listar e filtrar os orçamentos: é o `AzuosQuoteListView`.'],
  },

  AzuosCommandSearch: {
    summary:
      'A busca de dentro de um menu de escolha: a linha de pesquisa reta, com a lupa e o fio embaixo, seguida da lista que filtra enquanto se digita. O filtro e o teclado são os do bits-ui.',
    use: [
      'Dentro do balão de um campo com busca (o `AzuosComboboxField` já usa).',
      'Com as linhas em `AzuosCommandSearchItem`.',
    ],
    avoid: [
      'Escolher uma opção num formulário: use o campo pronto (`AzuosComboboxField`, `AzuosPersonPickerField`), que já traz o balão e a busca.',
      'Lista sem busca: use o `AzuosSelectField`.',
    ],
  },
  AzuosCommandSearchItem: {
    summary:
      'Uma linha da lista do `AzuosCommandSearch`: escolhida com clique, Enter ou setas, e podendo vir desabilitada. O `data.value` é o texto que o filtro compara (o rótulo, não o id).',
    use: ['Cada opção dentro de um `AzuosCommandSearch`.'],
    avoid: ['Fora do `AzuosCommandSearch`: sem ele não há filtro nem teclado.'],
  },

  /* ------------------------------------------------------------------ Chamados — chamados, perfis e avisos */
  AzuosRoleListView: {
    summary:
      'A tela de acessos: o cartão de quem está logado com os seus módulos (Infraestrutura, Sistema, Manutenção) e, para o super admin, a lista da equipe com uma linha por pessoa e os módulos que ela tem.',
    use: [
      'Na tela de cargos e no perfil (com `showTeam: false`, só o cartão da pessoa).',
      'Liberar ou tirar um módulo de alguém da equipe.',
    ],
    avoid: [
      'Mudar o nível (Administrador, Gestor, Usuário): ele vem do admin-console, não desta tela.',
      'Só mostrar os módulos de uma pessoa no perfil: use o `AzuosModuleAccessCard`.',
    ],
  },
  AzuosSearchPopoverContent: {
    summary:
      'A caixa flutuante de um seletor com busca: cabe na altura que sobra da tela, rola só a lista e, no celular, não abre o teclado antes de a pessoa tocar na busca.',
    use: [
      'Por dentro dos seletores com busca (já vem no `AzuosOptionPicker` e no `AzuosPeoplePicker`).',
    ],
    avoid: [
      'Direto numa tela: use um dos seletores prontos.',
      'Balão sem busca: use o popover comum.',
    ],
  },
  AzuosSidebarControls: {
    summary:
      'Os gestos do menu lateral: arrastar a borda para recolher ou expandir, clicar nela para alternar e, no celular, arrastar para a esquerda ou tocar num link para fechar a gaveta.',
    use: ['Dentro da casca padrão (já vem no `AzuosAppShell`).'],
    avoid: ['Fora do `AzuosAppShell`: ele depende do menu lateral da casca.'],
  },
  AzuosTicketComputersDialog: {
    summary:
      'O diálogo grande para vincular máquinas a um chamado: busca e filtro de departamento iguais aos do Inventário, várias máquinas marcadas de uma vez e nada gravado antes de "Aplicar".',
    use: ['Na ficha do chamado, quando o atendimento passa por uma ou mais máquinas.'],
    avoid: [
      'Escolher uma máquina só num formulário: use o `AzuosOptionPicker` com a lista de máquinas.',
    ],
  },
  AzuosTicketDataForm: {
    summary:
      'Os dados do chamado que o TI corrige: urgência, área, tipo de problema, máquinas e sistema, além das áreas participantes. Cada correção salva vira uma linha na linha do tempo.',
    use: ['Na ficha do chamado (entra no `AzuosTicketDetailView`).'],
    avoid: [
      'Mudar o estágio: ele só anda lançando um histórico, no `AzuosTicketHistoryForm`.',
      'Abrir um chamado novo: use o `AzuosOpenTicketForm`.',
    ],
  },
  AzuosTicketDetailView: {
    summary:
      'A ficha de um chamado, a ordem de serviço: o pedido com os anexos, a linha do tempo e os dados, com o "Voltar", o PDF da ordem de serviço e o aviso por WhatsApp.',
    use: ['Na página de cada chamado das filas de Infraestrutura, Sistema e Manutenção.'],
    avoid: [
      'A fila de chamados: use o `AzuosTicketListView`.',
      'O acompanhamento pela pessoa que abriu: use o `AzuosTicketLookupView`, da Central.',
    ],
  },
  AzuosTicketHistoryForm: {
    summary:
      'Lançar um histórico no chamado: o tipo em dois grupos (dar andamento ou encerrar), a descrição, o tempo gasto, anexos, se quem abriu vê e quem recebe aviso por WhatsApp. O que o tipo faz é dito no grupo, na frase e no botão.',
    use: ['No fim da linha do tempo da ficha do chamado (entra no `AzuosTicketDetailView`).'],
    avoid: [
      'Corrigir urgência, área ou máquina: use o `AzuosTicketDataForm`.',
      'Resposta de quem abriu o chamado: use o `AzuosTicketReplyForm`, da Central.',
    ],
  },
  AzuosTicketListView: {
    summary:
      'A fila de chamados de uma área: cartões de número que filtram, gráficos, filtros (estágio, urgência, departamento, tipo, responsável), a lista paginada e o relatório para baixar.',
    use: ['Na fila de chamados de Infraestrutura, Sistema e Manutenção.'],
    avoid: [
      'Mudar o estágio ou excluir: chamado não some da fila, e o estágio muda na ficha.',
      'O quadro por colunas do Sistema: use o `AzuosSystemKanbanView`.',
    ],
  },
  AzuosTicketRelationsCard: {
    summary:
      'Os chamados vinculados a este: a lista com link para cada um e a busca por ID, protocolo ou assunto para vincular mais ou desvincular.',
    use: ['Na ficha do chamado, para acompanhar chamados relacionados entre si.'],
    avoid: ['Vincular máquinas: use o `AzuosTicketComputersDialog`.'],
  },
  AzuosTicketStockItemsCard: {
    summary:
      'Os itens do depósito que o atendimento tira (saída) ou devolve (entrada), em pequenos cards. O item fica reservado e o saldo só muda no encerramento; com o chamado encerrado, a lista é só leitura.',
    use: ['Na ficha do chamado, quando o atendimento usa peça ou item do estoque.'],
    avoid: [
      'Ver o que os chamados abertos reservaram de um item, na tela do Depósito: use o `AzuosTicketStockLinks`.',
    ],
  },
  AzuosTicketStockLinks: {
    summary:
      'Embaixo do saldo de um item do depósito: quanto os chamados abertos já reservaram, quanto ainda está disponível e quanto vai voltar, com um balão que lista os chamados e leva a cada um. Sem chamado, não aparece.',
    use: ['Na lista do Depósito, junto do saldo de cada item.'],
    avoid: ['Lançar o item num chamado: use o `AzuosTicketStockItemsCard`, na ficha.'],
  },
  AzuosTicketWatchersCard: {
    summary:
      'As pessoas vinculadas ao chamado: acompanham, respondem e reabrem junto de quem abriu. Marcar ou tirar salva na hora.',
    use: ['Na ficha do chamado.'],
    avoid: ['Escolher quem recebe aviso de um andamento: isso fica no `AzuosTicketHistoryForm`.'],
  },
  AzuosUserProfileDialog: {
    summary:
      'Um diálogo com o nome, o e-mail e o cargo da pessoa em cada área (Sistema, Infraestrutura, Manutenção), com os botões opcionais "Ver cargos da equipe" e "Sair da conta".',
    use: ['Mostrar rapidamente os cargos de quem está logado, sem sair da tela.'],
    avoid: [
      'A ficha completa: a tela "Meu perfil" (`AzuosMyProfileView`) é a padrão e não muda.',
      'A lista de acessos da equipe: use o `AzuosRoleListView`.',
    ],
  },
  AzuosWhatsappNoticeList: {
    summary:
      'Os avisos de WhatsApp de um chamado: os que saíram, os que estão na fila e os que pararam, com o motivo e o "Reenviar" para quem pode. Sem aviso nenhum, não aparece.',
    use: ['Na ficha do chamado, logo abaixo do aviso por WhatsApp.'],
    avoid: ['Configurar o WhatsApp da pessoa: use o `AzuosWhatsappLinkCard`, no perfil.'],
  },

  /* ------------------------------------------------------------------ Chamados — Infra (computadores, manutenção, rede, peças) */
  AzuosBudgetView: {
    summary:
      'A tela de Orçamento: o que comprar para o parque, já descontando o que o depósito tem. Cada necessidade mostra a conta inteira ("precisam · depósito tem · comprar"), a estimativa de preço de referência e as máquinas que entraram na conta.',
    use: ['Na tela Orçamento da Infra (já vem nela).'],
    avoid: [
      'Para ver o saldo de cada peça: é o `AzuosPartListView` (Depósito).',
      'Para achar as máquinas que precisam de upgrade: é o filtro "Upgrade" do `AzuosComputerListView`.',
    ],
  },
  AzuosActionMenu: {
    summary:
      'O botão secundário "⋯" que abre um menu de ações, com ícone por item, separador e item destrutivo em vermelho. Só avisa qual item foi escolhido; a confirmação fica com a tela.',
    use: [
      'Juntar as ações menos usadas de uma ficha num botão só ("Mais ações" da ficha da máquina).',
    ],
    avoid: [
      'A ação principal da área: deixe à vista num `AzuosActionButton`.',
      'Ação de uma linha de lista ou tabela: use o menu de três pontinhos da própria linha.',
    ],
  },
  AzuosComputerBlockDialog: {
    summary:
      'A pergunta "Bloquear esta máquina?", com o campo de motivo junto. Bloqueada, a máquina tem o agente recusado e continua no inventário com o histórico. O motivo digitado sai no `onConfirm`; o diálogo não grava nada.',
    use: ['Ao bloquear uma máquina pela ficha (item "Bloquear" de "Mais ações").'],
    avoid: [
      'Desbloquear, arquivar ou outra pergunta sem campo: use o `AzuosConfirmDialog`.',
      'Tirar a máquina de uso de vez: é o `AzuosComputerDisposalDialog`.',
    ],
  },
  AzuosComputerDisposalDialog: {
    summary:
      'A pergunta "Descartar esta máquina?", com o tipo de descarte (Com defeito ou Lixo) e o motivo, que é obrigatório e recusado ali mesmo quando vazio. Nada é apagado: a máquina vai para o Descarte e pode voltar.',
    use: ['Ao descartar uma máquina pela ficha (item "Descartar" de "Mais ações").'],
    avoid: [
      'Só parar o agente, mantendo a máquina no inventário: é o `AzuosComputerBlockDialog`.',
      'Devolver uma máquina descartada: é a pergunta da tela `AzuosDisposalListView`.',
    ],
  },
  AzuosComputerDetailView: {
    summary:
      'A ficha de um computador, na ordem da pergunta de quem abre: identificação e ações, próxima manutenção, o que precisa de atenção, uso ao vivo, aplicativos que mais pesam, uso das últimas 24 horas, hardware, alertas, manutenções, chamados, transferências e peças recebidas.',
    use: ['Na tela de detalhe de uma máquina do inventário (já vem nela).'],
    avoid: [
      'Para a lista do parque: é o `AzuosComputerListView`.',
      'Para editar a identificação: é o `AzuosComputerFormDialog`, aberto pelo "Editar identificação".',
    ],
  },
  AzuosComputerListView: {
    summary:
      'A tela de Inventário: as máquinas da empresa com o resumo em números (online, saúde, alertas, CPU e memória), a barra de filtros, o relatório para baixar e a lista em cartões ou tabela. Não tem excluir: máquina que sai de uso é arquivada ou descartada.',
    use: ['Na tela Inventário da Infra (já vem nela).'],
    avoid: [
      'Para uma máquina só: é o `AzuosComputerDetailView`.',
      'Para as máquinas descartadas: é o `AzuosDisposalListView`.',
    ],
  },
  AzuosComputerLivePanel: {
    summary:
      'O que está acontecendo na máquina agora: processador por núcleo, memória (e a virtual, quando existe), volumes e as interfaces de rede em uso, cada um numa barra de uso. Sem leitura nenhuma, diz que falta instalar o agente.',
    use: ['No bloco "O que está acontecendo agora" da ficha da máquina (já vem nela).'],
    avoid: [
      'Para o uso ao longo do tempo: é o `AzuosUsageChart`.',
      'Para uma barra de uso solta: use o `AzuosUsageMeter`.',
    ],
  },
  AzuosComputerMaintenanceStatus: {
    summary:
      'A leitura da manutenção de uma máquina em selos e linhas curtas: agendamento com contagem de dias, alertas críticos ativos e a situação da preventiva (vencida, sem registro ou em dia, com a próxima data). Máquina arquivada ou descartada aparece como "Fora de uso".',
    use: ['Na coluna e no cartão de manutenção do inventário, para os dois dizerem o mesmo.'],
    avoid: [
      'No alto da ficha, com as ações de agendar e registrar: é o `AzuosMaintenanceScheduleCard`.',
    ],
  },
  AzuosComputerUpgradeBadge: {
    summary:
      'O aviso âmbar "Upgrade" da máquina que está aquém — pouca memória, pouco espaço em disco ou processador antigo —, com os motivos e os números no balão. É atenção, não emergência: não pisca nem entra no selo vermelho dos alertas.',
    use: ['No cartão e na tabela do Inventário (já vem no `AzuosComputerCard` e no `AzuosComputerTable`).'],
    avoid: [
      'Para alerta aberto ou preventiva vencida: é o `AzuosComputerAlertBadge`, que pisca.',
      'Para quantas peças comprar: é o `AzuosBudgetView`.',
    ],
  },
  AzuosComputerProcessTable: {
    summary:
      'Os aplicativos que mais pesam na máquina, com processador e memória de cada um e quantos processos ele abriu. Mostra os dez primeiros (ou o `limit`) e resume o resto em "e mais N".',
    use: ['No bloco "Aplicativos que mais pesam" da ficha da máquina (já vem nela).'],
    avoid: ['Para uma lista com filtro, ordenação e muitas linhas: use o `AzuosTable`.'],
  },
  AzuosComputerTokenDialog: {
    summary:
      'O token do agente, mostrado uma única vez, com três saídas: "Copiar código", "Copiar comando" (o do PowerShell) e, quando a tela oferece, "Baixar instalador (.zip)" — MSI, certificado, scripts e o instalar.cmd de dois cliques, com o token dentro. Ao copiar, o botão diz "Copiado!". Fechou sem guardar, só gerando outro.',
    use: ['Logo depois de cadastrar uma máquina ou de gerar um token novo pela ficha.'],
    avoid: ['Para mostrar um dado que pode ser lido de novo depois: aí não precisa deste aviso.'],
  },
  InventoryFilters: {
    summary:
      'A barra de filtros do inventário: busca, departamento oficial (pelo id do RH) e o botão "Filtros", que abre o painel com responsável, conexão, saúde, recursos, alertas, preventiva, tipo e arquivadas. Cada filtro ligado vira uma etiqueta com X embaixo.',
    use: ['Na tela Inventário (já vem no `AzuosComputerListView`).'],
    avoid: ['Para filtrar outra lista: monte a barra com o `FilterPanel` e os campos da casa.'],
  },
  AzuosMaintenanceScheduleCard: {
    summary:
      'O próximo compromisso de manutenção no alto da ficha: o dia agendado (que ganha da preventiva automática) ou o prazo dos três meses, com a contagem de dias e o ícone no tom da urgência. Traz os botões de agendar, remarcar, cancelar e registrar.',
    use: ['No alto da ficha da máquina (já vem no `AzuosComputerDetailView`).'],
    avoid: [
      'Na lista do inventário, sem ações: é o `AzuosComputerMaintenanceStatus`.',
      'Para as pendências do parque inteiro: é o `AzuosPreventiveBoard`.',
    ],
  },
  AzuosMaintenanceScheduleDialog: {
    summary:
      'O modal de agendar ou remarcar a manutenção de uma máquina: o dia e, se quiser, o que vai ser feito. Valor e erro de cada campo chegam prontos.',
    use: ['Pelos botões "Agendar manutenção" e "Remarcar" da ficha da máquina.'],
    avoid: ['Para registrar uma manutenção que já foi feita: é o `AzuosMaintenanceFormDialog`.'],
  },
  AzuosTransferDialog: {
    summary:
      'O modal de transferir a máquina de departamento: para onde vai (um departamento oficial do RH ou a prateleira), quem levou, observação e, para cada peça ligada a ela, se vai junto ou fica na estação — e, se fica, qual máquina assume.',
    use: ['Pelo botão "Transferir" da ficha da máquina.'],
    avoid: [
      'Para só corrigir o cadastro da máquina: é o `AzuosComputerFormDialog`.',
      'Para dar entrada ou saída de peça no depósito: é o `AzuosMovementFormDialog`.',
    ],
  },
  AzuosUsageChart: {
    summary:
      'O uso da máquina ao longo do tempo: processador, memória e disco sobrepostos, com a escala travada em 0–100% e as mesmas cores e nomes em toda tela. É o `AzuosAreaChart` com as três séries fixas, alto por padrão para a curva aparecer.',
    use: ['Em toda tela que mostra o histórico de uso de uma máquina (ficha e painel ao vivo).'],
    avoid: [
      'Para o retrato de agora: é o `AzuosComputerLivePanel`.',
      'Para outras séries de tempo: use o `AzuosAreaChart` direto.',
    ],
  },
  AzuosDisposalListView: {
    summary:
      'A tela de Descarte da Infra: as máquinas que saíram de uso, com o tipo e o motivo, o resumo por tipo, busca e filtro por tipo, em cartões ou tabela. A única escrita é devolver a máquina ao inventário, com confirmação.',
    use: ['Na tela Descarte da Infra (já vem nela).'],
    avoid: [
      'Para descartar uma máquina: isso acontece na ficha, pelo `AzuosComputerDisposalDialog`.',
      'Para produtos do depósito da Manutenção: é o `AzuosInventoryDisposalListView`.',
    ],
  },
  AzuosMaintenanceListView: {
    summary:
      'A tela de Manutenção: o quadro de preventivas pendentes no alto e, embaixo, o histórico do que já foi feito, com busca, filtro por tipo e paginação. Cada registro pode ser corrigido ou excluído, com confirmação.',
    use: ['Na tela Manutenção da Infra (já vem nela).'],
    avoid: ['Para as manutenções de uma máquina só: estão na ficha, no `AzuosComputerDetailView`.'],
  },
  AzuosPreventiveBoard: {
    summary:
      'O lembrete das preventivas: primeiro as agendadas, depois as máquinas vencidas ou nunca abertas, cada uma com o botão "Registrar". As em dia não entram na lista; aparecem só como total.',
    use: ['No alto da tela de Manutenção (já vem no `AzuosMaintenanceListView`).'],
    avoid: ['Para o prazo de uma máquina só: é o `AzuosMaintenanceScheduleCard`, na ficha.'],
  },
  AzuosNetworkListView: {
    summary:
      'A tela de Rede: as quedas e a instabilidade do link de internet avisadas pelo UniFi, com o resumo do período, filtros de tipo, gravidade, andamento e período, e o "Marcar como resolvido" / "Reabrir" de cada evento.',
    use: ['Na tela Rede da Infra (já vem nela).'],
    avoid: ['Para alertas de uma máquina: estão na ficha, no `AzuosComputerDetailView`.'],
  },
  AzuosPartLedgerDialog: {
    summary:
      'O extrato de uma peça num modal: cada entrada e saída, o saldo depois de cada uma e para qual máquina foi. Movimento que veio de um chamado é link para ele e não se exclui aqui; os outros se excluem com confirmação.',
    use: ['Ao clicar no nome de uma peça no Depósito da Infra.'],
    avoid: ['Para lançar uma entrada ou saída: é o `AzuosMovementFormDialog`.'],
  },
  AzuosPartListView: {
    summary:
      'A tela de Depósito da Infra: as peças de reposição, com o resumo (tipos, peças na prateleira, sem estoque), filtros de categoria, condição e estoque, e em cada peça os botões de entrada, saída e corrigir. Peça com saldo zero continua na lista, em vermelho.',
    use: ['Na tela Depósito da Infra (já vem nela).'],
    avoid: [
      'Para os produtos do depósito da Manutenção: é o `AzuosStockListView`.',
      'Para o extrato de uma peça: é o `AzuosPartLedgerDialog`.',
    ],
  },

  /* ------------------------------------------------------------------ Chamados — Manutenção, perfil, sistemas e suporte público */
  AzuosInventoryDisposalListView: {
    summary:
      'A tela de Descarte da Manutenção: o que saiu de uso, quando, quanto e por quê. É um registro, não um cadastro — descarte não se edita nem se apaga, e o único botão é o de registrar outro.',
    use: ['Na tela de Descarte do módulo Manutenção, com o filtro por motivo.'],
    avoid: [
      'Descarte de computador da Infra: é o `AzuosDisposalListView`.',
      'Para registrar o descarte em si: o diálogo é o `AzuosInventoryMovementDialog`.',
    ],
  },
  AzuosInventoryListView: {
    summary:
      'O Inventário da Manutenção: o que existe no escritório, em cartões com foto, com busca, filtro por categoria e "só sem foto", editar e excluir com confirmação.',
    use: ['Na tela de Inventário do módulo Manutenção.'],
    avoid: [
      'Para ver quanto há de cada produto: é o `AzuosStockListView`, os mesmos produtos lidos pela quantidade.',
      'Para cadastrar ou editar o produto: o diálogo é o `AzuosInventoryFormDialog`.',
    ],
  },
  AzuosQuoteListView: {
    summary:
      'Os Orçamentos da Manutenção: o que foi cotado com empresas de fora, num lugar só, em cartões de lista com a situação, o tipo, o valor e o documento. Busca, filtro por situação e por tipo, editar e excluir com confirmação.',
    use: ['Na tela de Orçamentos do módulo Manutenção.'],
    avoid: [
      'Não sugere valores: só guarda os orçamentos que já existem.',
      'Para cadastrar ou editar um orçamento: o diálogo é o `AzuosQuoteFormDialog`.',
    ],
  },
  AzuosStockListView: {
    summary:
      'O Depósito da Manutenção: quanto há de cada produto, com o número em destaque e os dois botões que mudam o número (Entrada e Saída). Busca, filtro por categoria e "só sem estoque".',
    use: ['Na tela de Depósito do módulo Manutenção.'],
    avoid: [
      'Para ver o que é o produto (foto, lugar, etiqueta): é o `AzuosInventoryListView`.',
      'Para registrar a entrada ou a saída: o diálogo é o `AzuosInventoryMovementDialog`.',
    ],
  },
  AzuosModuleAccessCard: {
    summary:
      'A seção "Seus módulos" do perfil, só deste sistema: Infra, Sistema e Manutenção, cada um com o nível de acesso da pessoa num selo. O nível vem do papel no admin-console; módulo ausente é "sem acesso".',
    use: ['Dentro da ficha "Meu perfil" do Chamados.'],
    avoid: [
      'Para liberar ou mudar o acesso de alguém: é a tela de Permissões (`AzuosRoleListView`, `AzuosRoleFormDialog`).',
    ],
  },
  AzuosWhatsappLinkCard: {
    summary:
      'O cartão de WhatsApp do perfil: diz se há um número vinculado, quantas mensagens saíram hoje e o teto do dia, e oferece vincular ou desvincular. Sem a integração configurada, explica e não mostra botão.',
    use: [
      'No perfil de quem pode vincular o WhatsApp — quem decide é a tela, que nem monta o cartão para os demais.',
      'O botão de editar os textos do bot só aparece quando a tela passa a ação (super admin).',
    ],
    avoid: [
      'O passo a passo do vínculo (riscos e QR code): é o `AzuosWhatsappLinkDialog`.',
      'Editar os textos do bot: é o `AzuosWhatsappTemplatesDialog`.',
    ],
  },
  AzuosWhatsappLinkDialog: {
    summary:
      'O vínculo do WhatsApp em dois passos: primeiro os riscos (o botão de confirmar fica travado alguns segundos, para dar tempo de ler), depois o QR code para ler com o celular.',
    use: ['Ao clicar em vincular no `AzuosWhatsappLinkCard`.'],
    avoid: [
      'Contagem e QR code não são gerados aqui: chegam prontos por props, e quem fecha o diálogo no fim é a tela.',
    ],
  },
  AzuosWhatsappTemplatesDialog: {
    summary:
      'A edição dos textos do bot de WhatsApp: escolher a mensagem, mexer no texto com as variáveis entre chaves duplas e ver embaixo como ela fica com um chamado de exemplo. Salva, restaura o original e desfaz a restauração.',
    use: ['Só para o super admin, aberto pelo cartão de WhatsApp do perfil.'],
    avoid: [
      'Vincular o número: é o `AzuosWhatsappLinkDialog`.',
      'A prévia e o "pode salvar" não são calculados aqui: chegam prontos por props.',
    ],
  },
  AzuosRoleFormDialog: {
    summary:
      'O diálogo "Liberar módulos": escolher a pessoa na lista de colaboradores (com busca) e marcar um ou mais módulos — Infra, Sistema, Manutenção. O nível dentro do módulo não se escolhe aqui: vem do papel no admin-console.',
    use: ['Na tela de Permissões, para liberar o acesso de alguém aos módulos.'],
    avoid: [
      'Para ver quem tem acesso: é o `AzuosRoleListView`.',
      'Para mudar o nível (administrador, gestor, usuário): é no admin-console, não neste sistema.',
    ],
  },
  AzuosGithubLinkGate: {
    summary:
      'A porta do módulo Sistema: tela cheia pedindo para vincular o GitHub antes de entrar, com "Vincular GitHub", "Verificar novamente" e "Ir para meu perfil". Sem a integração configurada, avisa e trava o botão de vincular.',
    use: ['Na entrada do módulo Sistema, para quem ainda não vinculou o GitHub.'],
    avoid: ['Dentro de uma tela que a pessoa já acessa: ele ocupa a tela inteira.'],
  },
  AzuosSystemKanbanView: {
    summary:
      'O Kanban de Sistema, no formato do quadro de tarefas do paralegal: os chamados em colunas por etapa, que começam na esquerda e rolam para o lado, arrastados de uma para outra pelo `@dnd-kit` (o cartão inteiro acompanha o ponteiro, o quadro rola sozinho perto da borda e o teclado também arrasta), com filtro por sistema, a altura da tela (cada coluna rola por dentro) e o "Expandir" para a tela inteira.',
    use: ['Na tela de Kanban do módulo Sistema.'],
    avoid: [
      'Lista de chamados com busca e filtros: é o `AzuosTicketListView`.',
      'Coluna de quadro genérica: é o `AzuosKanbanColumn`.',
    ],
  },
  AzuosSystemTicketCard: {
    summary:
      'Um chamado no Kanban de Sistema: o texto, os selos (sistema, urgência, etiqueta e a issue do GitHub), o protocolo com quem abriu e o responsável com foto, com o ícone grande da etapa no canto. O menu de três pontinhos troca a etiqueta.',
    use: ['Dentro das colunas do `AzuosSystemKanbanView`.'],
    avoid: [
      'Chamado numa lista ou tabela: é o `AzuosTicketListView`.',
      'Mudar a etapa com um seletor dentro do cartão: a etapa muda pelo arrasto (`AzuosKanbanDraggableCard`).',
    ],
  },
  AzuosKanbanDraggableCard: {
    summary:
      'O invólucro que torna um cartão arrastável no quadro, pelo `@dnd-kit`: mouse, toque e teclado (foco, Espaço pega, setas levam, Espaço solta, Esc desiste). O lugar do cartão fica apagado enquanto a cópia acompanha o ponteiro.',
    use: ['Em volta de cada cartão de um quadro, dentro do `DragDropProvider` do quadro.'],
    avoid: [
      'Fora de um `DragDropProvider`: sem o quadro em volta, não há para onde arrastar.',
      'Reordenar itens de uma lista: aí é o `@dnd-kit/svelte/sortable`.',
    ],
  },
  ProjectDetailView: {
    summary:
      'A página de um sistema: em cima, o andamento de relance (PRs abertos, issues abertas, o entregue na semana, os chamados em aberto); embaixo, a timeline dia a dia de PRs, merges e issues, com quem fez e quem fez junto.',
    use: [
      'Ao abrir um sistema na tela de Sistemas e Projetos.',
      'Com o filtro da timeline por tipo e, para quem pode, o botão de sincronizar com o GitHub.',
    ],
    avoid: [
      'A lista de todos os sistemas: é o `AzuosProjectListView`.',
      'A agenda do time: é o `AzuosWeekScheduleGrid`.',
    ],
  },
  AzuosProjectFormDialog: {
    summary:
      'O cadastro de um sistema: nome, repositório no GitHub, situação, cor identificadora, responsável e descrição. O mesmo diálogo cria e edita.',
    use: ['Ao cadastrar ou editar um sistema na tela de Sistemas e Projetos.'],
    avoid: [
      'O responsável aqui é só informação: não muda a quem os chamados vão.',
      'Agendar algo para o sistema: é o `AzuosScheduleEventDialog`.',
    ],
  },
  AzuosProjectListView: {
    summary:
      'A tela de Sistemas e Projetos: os sistemas em grade de cards, com busca, filtro por situação, editar, excluir com confirmação, ver a timeline e sincronizar com o GitHub (um a um ou todos, para quem tem o GitHub vinculado).',
    use: ['Na tela de Sistemas e Projetos do módulo Sistema.'],
    avoid: [
      'A página de um sistema só: é o `ProjectDetailView`.',
      'Cadastrar ou editar: o diálogo é o `AzuosProjectFormDialog`.',
    ],
  },
  AzuosGithubCalendarEvent: {
    summary:
      'Uma atividade do GitHub (PR, issue ou merge local) dentro do calendário: a hora, o número e o título, com link para o GitHub e o detalhe (situação, sistema, autor, data) na dica ao passar o mouse.',
    use: [
      'Dentro do `AzuosWeekScheduleGrid` (já vem nele), em formato compacto no mês ou em bloco na grade de horas.',
    ],
    avoid: [
      'Compromisso da agenda: o cartão é o do próprio calendário, na cor escolhida.',
      'A lista de tudo de um dia: é o `AzuosGithubDayDialog`.',
    ],
  },
  AzuosGithubDayDialog: {
    summary:
      'As atividades do GitHub de um dia, em diálogo: PRs, issues, merges ou todas, do mais cedo ao mais tarde no horário local, com a situação e o link de cada uma, em páginas.',
    use: ['Ao clicar nas atividades do GitHub de um dia na agenda (`AzuosWeekScheduleGrid`).'],
    avoid: ['Uma atividade só, dentro do calendário: é o `AzuosGithubCalendarEvent`.'],
  },
  AzuosScheduleEventDialog: {
    summary:
      'O diálogo da agenda do módulo Sistema, em dois tipos: compromisso (algo marcado para acontecer, com início e fim) ou registro (algo que já foi feito, com a hora). Título, data, categoria, sistema, uma das oito cores e descrição; na edição, também excluir.',
    use: ['Ao criar ou abrir um item na agenda do módulo Sistema.'],
    avoid: [
      'Cadastro do sistema em si: é o `AzuosProjectFormDialog`.',
      'A cor escolhida aqui é a mesma do cartão na agenda: não invente outra tabela de cores.',
    ],
  },
  AzuosTimePicker: {
    summary:
      'O campo de horário em 24 horas: abre um popover com hora e minuto e o botão de aplicar, sem depender do seletor do navegador nem arredondar os minutos.',
    use: ['Início, fim ou hora de um item da agenda (já vem no `AzuosScheduleEventDialog`).'],
    avoid: ['Para escolher o dia: use o `AzuosDatePicker` ou o `AzuosDateField`.'],
  },
  AzuosWeekScheduleGrid: {
    summary:
      'A agenda do módulo Sistema, em dia, semana ou mês: os compromissos na cor de cada um, a grade de 08:00 às 18:00, as atividades do GitHub com o resumo por pessoa, e os filtros por sistema, autor e tipo.',
    use: [
      'Na tela de Agenda do módulo Sistema.',
      'Clicar num espaço vazio cria um item naquele dia e, na grade de horas, naquele horário.',
    ],
    avoid: [
      'Escolher uma data num formulário: use o `AzuosDatePicker`.',
      'A história de um sistema só: é o `ProjectDetailView`.',
    ],
  },
  AzuosOpenTicketForm: {
    summary:
      'O formulário público de abrir chamado, em etapas, uma por vez: a área, quem é você, o problema, o que aconteceu (com print e anexos) e quem cuida do chamado. Depois de abrir, o formulário sai da tela e dá lugar ao protocolo.',
    use: ['Na tela "Abrir chamado" da Central de Chamados.'],
    avoid: [
      'Acompanhar um chamado já aberto: é o `AzuosTicketLookupView`.',
      'Corrigir os dados de um chamado pelo TI: é o `AzuosTicketDataForm`.',
    ],
  },
  AzuosSupportNavbar: {
    summary:
      'A barra de cima da Central de Chamados, numa linha só: a marca, as duas telas (Abrir chamado e Consultar chamado), o tema, a pessoa logada e a saída. A tela atual vem por `activeHref`; a barra não navega sozinha.',
    use: ['No topo de toda tela da Central de Chamados, que fica fora da casca dos módulos.'],
    avoid: ['Dentro dos módulos: lá o menu é o da casca padrão (`AzuosAppShell`).'],
  },
  AzuosTicketLookupView: {
    summary:
      'A tela "Consultar chamado", em duas colunas como uma caixa de entrada: à esquerda a busca pelo número e os chamados da pessoa (em andamento e encerrados); à direita o chamado aberto, com a trilha (recebido → em atendimento → encerrado), os dados e a linha do tempo. No celular, uma coluna só.',
    use: [
      'Na Central de Chamados, para quem pediu acompanhar o que abriu ou em que foi vinculado.',
      'O que a pessoa faz no chamado entra pelo encaixe `ticketActions` (o `AzuosTicketReplyForm`).',
    ],
    avoid: [
      'O atendimento por dentro, do lado do TI: é o `AzuosTicketDetailView`.',
      'O chamado que chega aqui já vem podado pelo servidor (sem telefone, sem responsável): não acrescente esses dados.',
    ],
  },
  AzuosTicketReplyForm: {
    summary:
      'O lado de quem pediu, dentro da consulta: escrever no chamado (texto e arquivos), escolher quem avisar e cuidar das pessoas vinculadas. Responder e reabrir são o mesmo formulário — com o chamado encerrado, ele vira "Reabrir chamado" e pede o porquê.',
    use: ['No encaixe de ações do `AzuosTicketLookupView`.'],
    avoid: [
      'O registro do atendimento pelo TI: é o `AzuosTicketHistoryForm`.',
      'Abrir um chamado novo: é o `AzuosOpenTicketForm`.',
    ],
  },
  AzuosServiceOrderLookupForm: {
    summary:
      'A entrada da conferência de ordem de serviço: um campo para o código do rodapé do documento e um botão.',
    use: ['Para quem tem o papel na mão, e não o link nem o QR code.'],
    avoid: ['O resultado da conferência: é o `AzuosServiceOrderVerifyView`.'],
  },
  AzuosServiceOrderVerifyView: {
    summary:
      'A conferência pública de uma ordem de serviço emitida, em dois níveis ditos com clareza: o registro (esta emissão existe e foi isto que o sistema emitiu) e o arquivo (o PDF escolhido confere, ou não, com o emitido).',
    use: ['Na tela pública de conferência, aberta pelo link, pelo QR code ou pelo código.'],
    avoid: [
      'Digitar o código: é o `AzuosServiceOrderLookupForm`.',
      'A impressão digital do arquivo não é calculada aqui: o resultado chega pronto por props.',
    ],
  },
};
