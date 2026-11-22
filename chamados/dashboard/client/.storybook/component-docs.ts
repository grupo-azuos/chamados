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
      'Botões que são uma escolha só, lado a lado (Dia · Semana · Mês), no desenho segmentado: um trilho cinza em pílula com a opção escolhida em branco por cima.',
    use: ['Trocar o período ou o recorte de um gráfico.', 'Abas curtas dentro de um card.'],
    avoid: [
      'Mais de cinco opções: use o `AzuosOptionPicker`, que vira lista.',
      'Filtros que se somam: use chips ou o `AzuosMultiSelectField`.',
    ],
  },
  AzuosClearFiltersButton: {
    summary:
      'O "Limpar filtros" de toda tela que filtra. Só aparece quando há filtro ligado e diz quantos são.',
    use: ['No fim da barra de filtros de qualquer lista.'],
    avoid: ['Para desfazer um formulário: aí é o botão "Cancelar" do próprio formulário.'],
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
      'Os botões de "baixar relatório" (Excel, PDF), sempre na mesma forma. Quem gera o arquivo é a tela; o componente só mostra e avisa o clique.',
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
      'Escolha de cor: "aleatória", as cores da paleta e qualquer outra pelo seletor do navegador. Cor livre vira o tom mais próximo na tela.',
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
      'O campo de período: de uma data até outra, com dois calendários lado a lado e atalhos (este mês, últimos 30 dias).',
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
    avoid: ['Montar card à mão com `bg-card border`: é recusado no check:design.'],
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
      'O fim da lista que rola: pede a próxima página ao chegar perto e mostra os esqueletos.',
    use: ['Rodapé das listas em tabela.'],
    avoid: ['Grade de cards: ela pagina com o `AzuosPaginationBar`.'],
  },
  AzuosKanbanColumn: {
    summary: 'Uma coluna de quadro: título com contagem, os cartões e o "Adicionar" no fim.',
    use: ['Quadros de tarefas, de etapas, de funil.'],
    avoid: ['Lista simples: use a tabela.'],
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
    summary: 'A linha do tempo de um registro: quem, quando, o quê e de que tipo.',
    use: ['Aba de histórico de qualquer registro.'],
    avoid: ['Etapas de um processo: use o `AzuosTimeline`.'],
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
    use: ['Etapas de um processo, de um pedido, de um alvará.'],
    avoid: ['Histórico de alterações: use o `AzuosHistoryTimeline`.'],
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
      'A pergunta antes do que não tem volta. O botão diz o verbo ("Excluir tarefa"), e o padrão é cancelar.',
    use: ['Excluir, arquivar, enviar.'],
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
      'Nenhum erro derruba a tela em silêncio: no lugar da página em branco, a mensagem e o caminho de volta.',
    use: ['Já envolve o app inteiro.'],
    avoid: ['Erro de uma busca: use o `AzuosErrorState`.'],
  },
  AzuosEmptyState: {
    summary:
      'A lista vazia com o que fazer a respeito. Vazio não é erro: a tela diz "não há nada aqui", com o Zuzu quando faz sentido.',
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
      'A casca padrão do grupo: menu lateral, atalhos, sininho e perfil — igual nos 13 sistemas e travada.',
    use: ['Em volta de todo o app (já vem).'],
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
      'A marca a partir dos arquivos oficiais: logo branca sobre a barra azul, ícone no resto.',
    use: ['Casca, telas de entrada, documentos.'],
    avoid: ['Redesenhar a marca.'],
  },
  AzuosBreadcrumb: {
    summary: 'A trilha de onde a pessoa está: "Tarefas › Revisar contrato › Histórico".',
    use: ['Telas com três níveis ou mais.'],
    avoid: ['Telas de primeiro nível: o título basta.'],
  },
  AzuosIdentityOverview: {
    summary: 'O resumo da identidade de quem está usando: nome, e-mail, acessos.',
    use: ['Telas de perfil e de conta.'],
    avoid: ['Lista de pessoas.'],
  },
  AzuosMyProfileView: {
    summary: 'Meu perfil: a mesma ficha nos 13 sistemas, com foto, dados e preferências.',
    use: ['A tela "Meu perfil" (já vem).'],
    avoid: ['Mudar por sistema.'],
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
      'Efeitos visuais completos ou leves, para máquinas lentas. Guarda a preferência sozinho.',
    use: ['Menu de preferências da casca.'],
    avoid: ['Configurar animação por tela.'],
  },
  AzuosThemeToggle: {
    summary: 'Troca entre claro e escuro (o grafite). Guarda a preferência sozinho.',
    use: ['Menu de preferências da casca.'],
    avoid: ['Criar outros temas: o padrão Apple é um só.'],
  },

  /* ------------------------------------------------------------------ Mascote */
  AzuosZuzu: {
    summary:
      'O Zuzu, a arara mascote da casa. Estático, sempre: fala no alerta do dia, na lista vazia e na pendência.',
    use: ['Hero de painel, estados vazios, avisos de "falta isto".'],
    avoid: ['Enfeite de canto, animação, giro ou escala (recusados no check:design).'],
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
      'A faixa de filtros do painel ("Pessoa", "Período") que recorta todos os blocos de uma vez.',
    use: ['Topo de todo dashboard.'],
    avoid: ['Filtro de um bloco só: ele fica na edição do bloco.'],
  },
  AzuosBoardStudio: {
    summary:
      'Montar o painel em tela cheia: o tabuleiro à esquerda e os tipos de bloco à direita, para arrastar.',
    use: ['"Editar painel" de quem pode editar.'],
    avoid: ['Uso diário: quem só vê usa o `AzuosBoardView`.'],
  },
  AzuosBoardView: {
    summary:
      'O dashboard: as abas dos painéis (Equipe, Gestor, Pessoal) e o painel. Primeira tela de todo sistema.',
    use: ['A tela Dashboard (já vem; o projeto muda só as fontes de dados).'],
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
      'O hero do painel com o Zuzu: a frase do dia e os números principais em cards, com o ícone cheio de cada tom.',
    use: ['Abertura do dashboard e do "Resumo do Dia".'],
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
      'O bloco aberto para editar: título, tipo de gráfico e campos à esquerda, a pré-visualização em tempo real à direita.',
    use: ['Edição de bloco no estúdio do painel.'],
    avoid: ['Fora do dashboard.'],
  },
};
