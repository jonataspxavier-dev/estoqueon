type Cell = string | number | boolean | Date | null | undefined;

function escape(value: Cell): string {
  if (value === null || value === undefined) return '';
  const text = value instanceof Date ? value.toISOString() : String(value);
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Gera CSV com separador ";" e BOM UTF-8 (abre corretamente no Excel em português).
 */
export function toCsv(headers: string[], rows: Cell[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escape).join(';'));
  return '﻿' + lines.join('\r\n') + '\r\n';
}
