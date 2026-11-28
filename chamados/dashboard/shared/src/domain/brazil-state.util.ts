/**
 * AS 27 UFs DO BRASIL, pela sigla e pelo nome — o seletor "Feriados de" do calendário.
 *
 * Lista fixa, e não uma consulta: UF não muda, e buscar 27 nomes num servidor a cada abertura do
 * painel seria uma ida à rede para nada. A ordem é a do nome, como a pessoa procura.
 */
export const BRAZIL_STATES = [
  { abbreviation: 'AC', name: 'Acre' },
  { abbreviation: 'AL', name: 'Alagoas' },
  { abbreviation: 'AP', name: 'Amapá' },
  { abbreviation: 'AM', name: 'Amazonas' },
  { abbreviation: 'BA', name: 'Bahia' },
  { abbreviation: 'CE', name: 'Ceará' },
  { abbreviation: 'DF', name: 'Distrito Federal' },
  { abbreviation: 'ES', name: 'Espírito Santo' },
  { abbreviation: 'GO', name: 'Goiás' },
  { abbreviation: 'MA', name: 'Maranhão' },
  { abbreviation: 'MT', name: 'Mato Grosso' },
  { abbreviation: 'MS', name: 'Mato Grosso do Sul' },
  { abbreviation: 'MG', name: 'Minas Gerais' },
  { abbreviation: 'PA', name: 'Pará' },
  { abbreviation: 'PB', name: 'Paraíba' },
  { abbreviation: 'PR', name: 'Paraná' },
  { abbreviation: 'PE', name: 'Pernambuco' },
  { abbreviation: 'PI', name: 'Piauí' },
  { abbreviation: 'RJ', name: 'Rio de Janeiro' },
  { abbreviation: 'RN', name: 'Rio Grande do Norte' },
  { abbreviation: 'RS', name: 'Rio Grande do Sul' },
  { abbreviation: 'RO', name: 'Rondônia' },
  { abbreviation: 'RR', name: 'Roraima' },
  { abbreviation: 'SC', name: 'Santa Catarina' },
  { abbreviation: 'SP', name: 'São Paulo' },
  { abbreviation: 'SE', name: 'Sergipe' },
  { abbreviation: 'TO', name: 'Tocantins' },
] as const;

/** A UF da casa: o Grupo Azuos é de Goiás, e o calendário abre com os feriados de lá. */
export const HOME_STATE = 'GO';

/** A sigla é de uma UF de verdade? (`go` vale: a comparação ignora a caixa.) */
export function isBrazilState(value: string): boolean {
  const upper = value.trim().toUpperCase();

  return BRAZIL_STATES.some((state) => state.abbreviation === upper);
}
