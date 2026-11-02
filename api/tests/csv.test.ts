import { toCsv } from '../src/utils/csv';

const linha = (cells: Parameters<typeof toCsv>[1][number]) => toCsv(['h'], [cells]).replace('﻿', '').split('\r\n')[1];

describe('toCsv', () => {
  it.each(['=1+1', '+1+1', '@SOMA(A1)', '-A1', '\tx'])('neutraliza fórmula em "%s"', (texto) => {
    expect(linha([texto])).toMatch(/^"?'/);
  });

  it('mantém números negativos e textos comuns intactos', () => {
    expect(linha([-3, '-3,50', 'Arroz 5kg', 10])).toBe('-3;-3,50;Arroz 5kg;10');
  });

  it('escapa aspas e separador', () => {
    expect(linha(['a;b', 'diz "oi"'])).toBe('"a;b";"diz ""oi"""');
  });
});
