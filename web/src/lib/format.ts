const brlFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const numFmt = new Intl.NumberFormat('pt-BR');

export const brl = (v: number) => brlFmt.format(v);
export const num = (v: number) => numFmt.format(v);
export const pct = (v: number) => `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;

export const dataHora = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });

/** "2026-11-02" → "02/11" */
export const diaCurto = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}`;
export const dataBr = (dia: string) => dia.split('-').reverse().join('/');

/** Data local no formato AAAA-MM-DD, deslocada em `dias` */
export function isoDia(dias = 0) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toLocaleDateString('sv-SE'); // sv-SE já usa AAAA-MM-DD
}
