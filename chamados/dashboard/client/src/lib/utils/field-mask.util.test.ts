import { describe, expect, it } from 'vitest';

import {
  fieldMaskError,
  formatFieldMask,
  formatStoredFieldMask,
  handleFieldMask,
} from './field-mask.util';

describe('CIN formatting', () => {
  it('uses CPF punctuation and preserves the cursor when editing in the middle', () => {
    expect(formatFieldMask('cin', '52998224725')).toBe('529.982.247-25');
    expect(
      handleFieldMask('cin', { value: '529.9182.247-25', selectionStart: 6 }).selectionStart,
    ).toBe(6);
  });

  it('reports incomplete and invalid CIN numbers', () => {
    expect(fieldMaskError('cin', '529982')).toBe('A CIN usa os 11 números do CPF');
    expect(fieldMaskError('cin', '52998224724')).toContain('CIN inválida');
    expect(fieldMaskError('cin', '52998224725')).toBeNull();
    expect(fieldMaskError('cin', '')).toBeNull();
  });
});

describe('formatStoredFieldMask', () => {
  it('formats values loaded without punctuation', () => {
    expect(formatStoredFieldMask('cpf', '52998224725')).toBe('529.982.247-25');
    expect(formatStoredFieldMask('cin', '52998224725')).toBe('529.982.247-25');
    expect(formatStoredFieldMask('cep', '74000000')).toBe('74000-000');
    expect(formatStoredFieldMask('cnae', '4712100')).toBe('4712-1/00');
    expect(formatStoredFieldMask('cnh', '00000000000')).toBe('00000000000');
  });

  it('preserves malformed saved values instead of dropping their content', () => {
    expect(formatStoredFieldMask('cpf', '529982247250')).toBe('529982247250');
    expect(fieldMaskError('cpf', '529982247250')).toBe('O CPF tem 11 números');
    expect(formatStoredFieldMask('cep', '74ABC000')).toBe('74ABC000');
    expect(formatStoredFieldMask('money', '0,01')).toBe('0,01');
  });
});

describe('handleFieldMask — formata ao digitar e ao colar', () => {
  // feliz
  it('cada tipo sai com a sua pontuação, venha como vier', () => {
    expect(formatFieldMask('cpf', ' 529 982 247 25 ')).toBe('529.982.247-25');
    expect(formatFieldMask('cep', '74000000')).toBe('74000-000');
    expect(formatFieldMask('cnae', '4712100')).toBe('4712-1/00');
    expect(formatFieldMask('integer', '0060000')).toBe('60.000');
    expect(formatFieldMask('money', '123456')).toBe('1.234,56');
    expect(formatFieldMask('cnpj', '11222333000181')).toBe('11.222.333/0001-81');
  });

  // feliz
  it('dinheiro se digita da direita para a esquerda, e o cursor fica no fim', () => {
    const result = handleFieldMask('money', { value: '1.234,567', selectionStart: 9 });

    expect(result.value).toBe('12.345,67');
    expect(result.selectionStart).toBe(result.value.length);
  });

  // feliz
  it('o primeiro dígito vira centavo e o cursor vai para depois dele, não para antes da vírgula', () => {
    const first = handleFieldMask('money', { value: '5', selectionStart: 1 });
    expect(first.value).toBe('0,05');
    expect(first.selectionStart).toBe(4);

    const second = handleFieldMask('money', { value: '0,050', selectionStart: 5 });
    expect(second.value).toBe('0,50');
    expect(second.selectionStart).toBe(4);
  });

  // feliz
  it('corrigir um dígito no meio do valor mantém o cursor ao lado dele', () => {
    const result = handleFieldMask('money', { value: '1.2934,56', selectionStart: 4 });

    expect(result.value).toBe('12.934,56');
    expect(result.selectionStart).toBe(4);
  });

  // triste
  it('apagar o último dígito devolve o cursor ao fim, sem pular para o começo', () => {
    const result = handleFieldMask('money', { value: '0,0', selectionStart: 3 });

    expect(result.value).toBe('0,00');
    expect(result.selectionStart).toBe(result.value.length);
  });

  // feliz
  it('corrigir no meio não joga o cursor para o fim', () => {
    const result = handleFieldMask('cpf', { value: '529.9182.247-25', selectionStart: 6 });

    expect(result.value).toBe('529.918.224-72');
    expect(result.selectionStart).toBe(6);
  });

  // triste
  it('letra não entra em campo de número, e o excesso é cortado', () => {
    expect(formatFieldMask('cep', 'ab74.000-0001234')).toBe('74000-000');
    expect(formatFieldMask('cpf', '1234567890123')).toBe('123.456.789-01');
  });
});

describe('fieldMaskError', () => {
  // triste
  it('aponta o formato errado ou incompleto', () => {
    expect(fieldMaskError('cpf', '529.982.247-24')).toBe('CPF inválido — confira os números');
    expect(fieldMaskError('cpf', '529.982')).toBe('O CPF tem 11 números');
    expect(fieldMaskError('cep', '7400')).toBe('O CEP tem 8 números');
    expect(fieldMaskError('cnpj', '11.222.333/0001-80')).toBe('CNPJ inválido — confira os números');
  });

  // feliz
  it('vazio, ou completo e certo, não é erro', () => {
    expect(fieldMaskError('cpf', '')).toBeNull();
    expect(fieldMaskError('cpf', '529.982.247-25')).toBeNull();
    expect(fieldMaskError('money', '1')).toBeNull();
    expect(fieldMaskError('cnae', '4712-1/00')).toBeNull();
  });
});

describe('phone formatting', () => {
  // feliz
  it('formats a landline and a mobile number', () => {
    expect(formatFieldMask('phone', '6230001234')).toBe('62 3000-1234');
    expect(formatFieldMask('phone', '(62) 99876-5432')).toBe('62 99876-5432');
    expect(fieldMaskError('phone', '62 3000-1234')).toBeNull();
  });

  // triste
  it('asks for the area code and the whole number', () => {
    expect(fieldMaskError('phone', '62 3000')).toBe(
      'O telefone tem DDD e número (10 ou 11 dígitos)',
    );
    expect(fieldMaskError('phone', '')).toBeNull();
  });
});
