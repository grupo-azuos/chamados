import { describe, expect, it } from 'vitest';

import { companyMatchesSearch, companyNameKey, digitsOnly, searchKey } from './company-search.util';

describe('companyNameKey', () => {
  /* O caso medido: "MASTER FORT - TELHAS" com dois espaços, ou virando "MASTER FORT
     - TELHAS LTDA.", deixava de casar e a empresa DESAPARECIA da tela de todo mundo.
     Corrigir o nome na planilha apagava a empresa. */
  it('casa o mesmo nome com espaço interno sobrando', () => {
    expect(companyNameKey('MASTER FORT  -  TELHAS')).toBe(companyNameKey('MASTER FORT - TELHAS'));
  });

  it('casa com hífen escrito com e sem espaço em volta', () => {
    expect(companyNameKey('MASTER FORT-TELHAS')).toBe(companyNameKey('MASTER FORT - TELHAS'));
  });

  it('casa ignorando acento, caixa e pontuação', () => {
    expect(companyNameKey('São João Comércio Ltda.')).toBe(
      companyNameKey('SAO JOAO COMERCIO LTDA'),
    );
  });

  it('devolve vazio para nulo, sem estourar', () => {
    expect(companyNameKey(null)).toBe('');
    expect(companyNameKey('  ')).toBe('');
  });

  it('não junta empresas que são de fato diferentes', () => {
    expect(companyNameKey('MASTER FORT TELHAS')).not.toBe(companyNameKey('MASTER FORTE TELHAS'));
  });
});

describe('digitsOnly', () => {
  it('tira a formatação do CNPJ', () => {
    expect(digitsOnly('12.345.678/0001-99')).toBe('12345678000199');
  });

  it('devolve vazio quando não há dígito nenhum', () => {
    expect(digitsOnly('NÃO POSSUI')).toBe('');
    expect(digitsOnly(null)).toBe('');
  });
});

describe('searchKey', () => {
  it('normaliza acento e caixa nos dois lados da comparação', () => {
    expect(searchKey('São João')).toBe('sao joao');
  });
});

describe('companyMatchesSearch', () => {
  const company = {
    name: 'São João Comércio Ltda',
    city: 'Goiânia',
    group: 'GRUPO ALFA',
    owner: 'Luanna',
    taxId: '12.345.678/0001-99',
    municipalRegistration: '98765432',
  };

  it('termo vazio mostra tudo', () => {
    expect(companyMatchesSearch(company, '')).toBe(true);
    expect(companyMatchesSearch(company, null)).toBe(true);
  });

  // 141 nomes da base têm acento: "sao joao" precisa achar "São João".
  it('acha ignorando acento', () => {
    expect(companyMatchesSearch(company, 'sao joao')).toBe(true);
    expect(companyMatchesSearch(company, 'goiania')).toBe(true);
  });

  // O campo `grupo` não era pesquisado, embora 522 empresas tenham um.
  it('pesquisa também o grupo e o responsável', () => {
    expect(companyMatchesSearch(company, 'grupo alfa')).toBe(true);
    expect(companyMatchesSearch(company, 'luanna')).toBe(true);
  });

  // 574 dos 1043 CNPJs estão guardados COM pontuação: colar os 14 dígitos precisa achar.
  it('acha pelo CNPJ colado sem pontuação', () => {
    expect(companyMatchesSearch(company, '12345678000199')).toBe(true);
    expect(companyMatchesSearch(company, '12.345.678/0001-99')).toBe(true);
  });

  it('acha pela inscrição municipal', () => {
    expect(companyMatchesSearch(company, '98765432')).toBe(true);
  });

  /* A regra de dígitos só vale para termo que é SÓ número. Rodá-la no termo cru
     fazia "sala 001" trazer 542 das 1.044 empresas — 52% do cadastro — porque todo
     CNPJ de matriz contém 0001. Isso é pior que não achar: quem vê zero recarrega,
     quem vê 542 desiste. */
  it('não transforma termo com palavra e número em busca por pedaço de CNPJ', () => {
    expect(companyMatchesSearch(company, 'sala 0001')).toBe(false);
    expect(companyMatchesSearch(company, 'loja 100')).toBe(false);
  });

  // Três dígitos casam com qualquer coisa; quem procura por número digita o CNPJ.
  it('ignora termo numérico curto demais para identificar alguém', () => {
    expect(companyMatchesSearch(company, '001')).toBe(false);
    expect(companyMatchesSearch(company, '12345')).toBe(false);
  });

  it('aceita pedaço longo o bastante do CNPJ', () => {
    expect(companyMatchesSearch(company, '123456')).toBe(true);
  });

  it('não acha o que não está na empresa', () => {
    expect(companyMatchesSearch(company, 'petrolina')).toBe(false);
    expect(companyMatchesSearch(company, '99999999999999')).toBe(false);
  });

  it('empresa nula não casa com termo preenchido', () => {
    expect(companyMatchesSearch(null, 'sao joao')).toBe(false);
  });

  it('não estoura quando os campos da empresa estão vazios', () => {
    expect(companyMatchesSearch({}, 'sao joao')).toBe(false);
    expect(companyMatchesSearch({ name: null, taxId: null }, '123456')).toBe(false);
  });
});
