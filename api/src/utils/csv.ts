type Cell = string | number | boolean | Date | null | undefined;

// Textos que o Excel/LibreOffice executariam como fórmula (CSV injection).
// "-" seguido de dígito é número negativo legítimo e não é alterado.
const INICIO_DE_FORMULA = /^(?:[=+@\t\r]|-(?!\d))/;

function escape(value: Cell): string {
  if (value === null || value === undefined) return '';
  let text = value instanceof Date ? value.toISOString() : String(value);
  if (typeof value === 'string' && INICIO_DE_FORMULA.test(text)) text = `'${text}`;
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Gera CSV com separador ";" e BOM UTF-8 (abre corretamente no Excel em português).
 */
export function toCsv(headers: string[], rows: Cell[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escape).join(';'));
  return '﻿' + lines.join('\r\n') + '\r\n';
}
