import { describe, expect, it } from 'vitest';

import { companyMatchesSearch, companyNameKey, digitsOnly, searchKey } from './company-search.util';

describe('companyNameKey', () => {
  /* O caso medido: "MASTER FORT - TELHAS" com dois espaços, ou virando "MASTER FORT
     - TELHAS LTDA.", deixava de casar e a empresa DESAPARECIA da tela de todo mundo.
     Corrigir o nome na planilha apagava a empresa. */
  it('matches the same name with extra inner spaces', () => {
    expect(companyNameKey('MASTER FORT  -  TELHAS')).toBe(companyNameKey('MASTER FORT - TELHAS'));
  });

  it('matches a hyphen written with and without spaces around it', () => {
    expect(companyNameKey('MASTER FORT-TELHAS')).toBe(companyNameKey('MASTER FORT - TELHAS'));
  });

  it('matches ignoring accents, case and punctuation', () => {
    expect(companyNameKey('São João Comércio Ltda.')).toBe(
      companyNameKey('SAO JOAO COMERCIO LTDA'),
    );
  });

  it('returns empty for null without throwing', () => {
    expect(companyNameKey(null)).toBe('');
    expect(companyNameKey('  ')).toBe('');
  });

  it('does not merge companies that are really different', () => {
    expect(companyNameKey('MASTER FORT TELHAS')).not.toBe(companyNameKey('MASTER FORTE TELHAS'));
  });
});

describe('digitsOnly', () => {
  it('strips the CNPJ formatting', () => {
    expect(digitsOnly('12.345.678/0001-99')).toBe('12345678000199');
  });

  it('returns empty when there is no digit', () => {
    expect(digitsOnly('NÃO POSSUI')).toBe('');
    expect(digitsOnly(null)).toBe('');
  });
});

describe('searchKey', () => {
  it('normalises accents and case on both sides of the comparison', () => {
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

  it('an empty term shows everything', () => {
    expect(companyMatchesSearch(company, '')).toBe(true);
    expect(companyMatchesSearch(company, null)).toBe(true);
  });

  // 141 nomes da base têm acento: "sao joao" precisa achar "São João".
  it('acha ignorando acento', () => {
    expect(companyMatchesSearch(company, 'sao joao')).toBe(true);
    expect(companyMatchesSearch(company, 'goiania')).toBe(true);
  });

  // O campo `grupo` não era pesquisado, embora 522 empresas tenham um.
  it('also searches the group and the person in charge', () => {
    expect(companyMatchesSearch(company, 'grupo alfa')).toBe(true);
    expect(companyMatchesSearch(company, 'luanna')).toBe(true);
  });

  // 574 dos 1043 CNPJs estão guardados COM pontuação: colar os 14 dígitos precisa achar.
  it('finds by a CNPJ pasted without punctuation', () => {
    expect(companyMatchesSearch(company, '12345678000199')).toBe(true);
    expect(companyMatchesSearch(company, '12.345.678/0001-99')).toBe(true);
  });

  it('finds by the municipal registration', () => {
    expect(companyMatchesSearch(company, '98765432')).toBe(true);
  });

  /* A regra de dígitos só vale para termo que é SÓ número. Rodá-la no termo cru
     fazia "sala 001" trazer 542 das 1.044 empresas — 52% do cadastro — porque todo
     CNPJ de matriz contém 0001. Isso é pior que não achar: quem vê zero recarrega,
     quem vê 542 desiste. */
  it('does not turn a term with a word and a number into a CNPJ fragment search', () => {
    expect(companyMatchesSearch(company, 'sala 0001')).toBe(false);
    expect(companyMatchesSearch(company, 'loja 100')).toBe(false);
  });

  // Três dígitos casam com qualquer coisa; quem procura por número digita o CNPJ.
  it('ignores a numeric term too short to identify anyone', () => {
    expect(companyMatchesSearch(company, '001')).toBe(false);
    expect(companyMatchesSearch(company, '12345')).toBe(false);
  });

  it('accepts a long enough CNPJ fragment', () => {
    expect(companyMatchesSearch(company, '123456')).toBe(true);
  });

  it('does not find what is not in the company', () => {
    expect(companyMatchesSearch(company, 'petrolina')).toBe(false);
    expect(companyMatchesSearch(company, '99999999999999')).toBe(false);
  });

  it('a null company does not match a filled term', () => {
    expect(companyMatchesSearch(null, 'sao joao')).toBe(false);
  });

  it('does not throw when the company fields are empty', () => {
    expect(companyMatchesSearch({}, 'sao joao')).toBe(false);
    expect(companyMatchesSearch({ name: null, taxId: null }, '123456')).toBe(false);
  });
});
