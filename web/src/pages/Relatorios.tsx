import { useState } from 'react';
import { Download } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api, qs } from '../lib/api';
import { useApi } from '../lib/hooks';
import { brl, dataBr, isoDia, num, pct } from '../lib/format';
import type { MaisVendido, Resumo } from '../lib/types';
import { Carregando, Erro, PageHeader, Vazio } from '../components/ui';

const exportacoes = [
  { tipo: 'vendas', label: 'Vendas (itens)' },
  { tipo: 'mais-vendidos', label: 'Mais vendidos' },
  { tipo: 'movimentacoes', label: 'Movimentações' },
  { tipo: 'estoque', label: 'Posição de estoque' },
];

export function Relatorios() {
  const [de, setDe] = useState(isoDia(-29));
  const [ate, setAte] = useState(isoDia());
  const periodo = qs({ de, ate });
  const resumo = useApi<Resumo>(`/relatorios/resumo${periodo}`);
  const top = useApi<MaisVendido[]>(`/relatorios/mais-vendidos${periodo}&limite=10`);
  const [exportando, setExportando] = useState<string | null>(null);
  const [erroExport, setErroExport] = useState<string | null>(null);

  async function exportar(tipo: string) {
    setExportando(tipo);
    setErroExport(null);
    try {
      await api.download(`/relatorios/exportar.csv${qs({ tipo, de, ate })}`);
    } catch (e) {
      setErroExport((e as Error).message);
    } finally {
      setExportando(null);
    }
  }

  const r = resumo.data;
  const linhas: [string, string][] = r
    ? [
        ['Quantidade de vendas', num(r.vendas.quantidade)],
        ['Itens vendidos', num(r.vendas.itensVendidos)],
        ['Faturamento', brl(r.vendas.faturamento)],
        ['Custo das mercadorias vendidas', brl(r.vendas.custoMercadoria)],
        ['Lucro bruto', brl(r.vendas.lucroBruto)],
        ['Margem bruta', pct(r.vendas.margemBruta)],
        ['Ticket médio', brl(r.vendas.ticketMedio)],
      ]
    : [];

  return (
    <>
      <PageHeader titulo="Relatórios" subtitulo="Desempenho de vendas, lucro e posição de estoque" />

      <div className="card mb-6 flex flex-wrap items-end gap-3 p-4">
        <div>
          <label className="label">De</label>
          <input type="date" className="input" value={de} max={ate} onChange={(e) => setDe(e.target.value)} />
        </div>
        <div>
          <label className="label">Até</label>
          <input type="date" className="input" value={ate} min={de} onChange={(e) => setAte(e.target.value)} />
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          {exportacoes.map((e) => (
            <button key={e.tipo} className="btn-secondary" disabled={!!exportando} onClick={() => exportar(e.tipo)}>
              <Download size={15} /> {exportando === e.tipo ? 'Gerando...' : e.label}
            </button>
          ))}
        </div>
      </div>
      {erroExport && <Erro mensagem={erroExport} />}
      {resumo.erro && <Erro mensagem={resumo.erro} />}
      {!r && resumo.carregando && <Carregando />}

      {r && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 [&>*]:min-w-0">
          <div className="card p-5">
            <h2 className="font-semibold">Resumo do período</h2>
            <p className="text-sm text-slate-500">
              {dataBr(r.periodo.de)} a {dataBr(r.periodo.ate)}
            </p>
            <dl className="mt-4 divide-y divide-slate-100">
              {linhas.map(([k, v]) => (
                <div key={k} className="flex justify-between py-2.5 text-sm">
                  <dt className="text-slate-600">{k}</dt>
                  <dd className="font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="card p-5">
            <h2 className="font-semibold">Estoque atual</h2>
            <p className="text-sm text-slate-500">Posição de hoje (não depende do período)</p>
            <dl className="mt-4 divide-y divide-slate-100">
              {(
                [
                  ['Produtos ativos', num(r.estoque.produtosAtivos)],
                  ['Unidades em estoque', num(r.estoque.unidades)],
                  ['Valor a preço de custo', brl(r.estoque.valorCusto)],
                  ['Valor a preço de venda', brl(r.estoque.valorVenda)],
                  ['Lucro potencial do estoque', brl(r.estoque.valorVenda - r.estoque.valorCusto)],
                  ['Produtos abaixo do mínimo', num(r.estoque.produtosAbaixoMinimo)],
                ] as [string, string][]
              ).map(([k, v]) => (
                <div key={k} className="flex justify-between py-2.5 text-sm">
                  <dt className="text-slate-600">{k}</dt>
                  <dd className="font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="card p-5 lg:col-span-2">
            <h2 className="font-semibold">Produtos mais vendidos</h2>
            {top.data?.length === 0 && <Vazio>Nenhuma venda no período.</Vazio>}
            {!!top.data?.length && (
              <>
                <div className="mt-4 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={top.data} layout="vertical" margin={{ left: 10, right: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 12, fill: '#64748b' }} />
                      <YAxis type="category" dataKey="nome" width={150} tick={{ fontSize: 12, fill: '#334155' }} />
                      <Tooltip formatter={(v) => [`${num(Number(v))} un`, 'Vendidos']} contentStyle={{ borderRadius: 8 }} />
                      <Bar dataKey="quantidade" fill="#0d9488" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[480px]">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="th">#</th>
                        <th className="th">Produto</th>
                        <th className="th text-right">Qtd</th>
                        <th className="th text-right">Receita</th>
                        <th className="th text-right">Lucro</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {top.data.map((p, i) => (
                        <tr key={p.produtoId}>
                          <td className="td text-slate-400">{i + 1}</td>
                          <td className="td">
                            {p.nome} <span className="text-xs text-slate-400">{p.sku}</span>
                          </td>
                          <td className="td text-right">{num(p.quantidade)}</td>
                          <td className="td text-right">{brl(p.receita)}</td>
                          <td className="td text-right font-medium text-emerald-700">{brl(p.lucro)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
