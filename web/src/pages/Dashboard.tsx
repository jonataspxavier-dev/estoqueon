import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Boxes, DollarSign, Receipt, TrendingUp } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useApi } from '../lib/hooks';
import { qs } from '../lib/api';
import { brl, diaCurto, isoDia, num, pct } from '../lib/format';
import type { Alerta, MaisVendido, Resumo } from '../lib/types';
import { Badge, Carregando, Erro, PageHeader, SeletorPeriodo, StatCard, Vazio } from '../components/ui';

export function Dashboard() {
  const [dias, setDias] = useState(30);
  const periodo = qs({ de: isoDia(-(dias - 1)), ate: isoDia() });
  const resumo = useApi<Resumo>(`/relatorios/resumo${periodo}`);
  const top = useApi<MaisVendido[]>(`/relatorios/mais-vendidos${periodo}&limite=5`);
  const alertas = useApi<Alerta[]>('/alertas/estoque-baixo');

  const r = resumo.data;

  return (
    <>
      <PageHeader titulo="Dashboard" subtitulo="Visão geral das vendas e do estoque" acoes={<SeletorPeriodo dias={dias} onChange={setDias} />} />

      {resumo.erro && <Erro mensagem={resumo.erro} />}
      {!r && resumo.carregando && <Carregando />}

      {r && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              titulo="Faturamento"
              valor={brl(r.vendas.faturamento)}
              icone={<DollarSign size={20} />}
              detalhe={`${num(r.vendas.quantidade)} vendas · ${num(r.vendas.itensVendidos)} itens`}
            />
            <StatCard
              titulo="Lucro bruto"
              valor={brl(r.vendas.lucroBruto)}
              icone={<TrendingUp size={20} />}
              detalhe={`Margem bruta de ${pct(r.vendas.margemBruta)}`}
            />
            <StatCard
              titulo="Ticket médio"
              valor={brl(r.vendas.ticketMedio)}
              icone={<Receipt size={20} />}
              detalhe={`Período de ${dias} dias`}
            />
            <StatCard
              titulo="Valor em estoque"
              valor={brl(r.estoque.valorCusto)}
              icone={<Boxes size={20} />}
              detalhe={`${num(r.estoque.unidades)} unidades · ${brl(r.estoque.valorVenda)} a preço de venda`}
            />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3 [&>*]:min-w-0">
            <div className="card p-5 xl:col-span-2">
              <h2 className="font-semibold text-slate-900">Vendas por dia</h2>
              <p className="text-sm text-slate-500">Faturamento diário no período</p>
              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={r.vendasPorDia} margin={{ left: -10, right: 8, top: 8 }}>
                    <defs>
                      <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0d9488" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#0d9488" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="dia" tickFormatter={diaCurto} tick={{ fontSize: 12, fill: '#64748b' }} minTickGap={20} />
                    <YAxis tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(v: number) => `R$${num(v)}`} width={70} />
                    <Tooltip
                      formatter={(v) => [brl(Number(v)), 'Faturamento']}
                      labelFormatter={(l) => diaCurto(String(l))}
                      contentStyle={{ borderRadius: 8, borderColor: '#e2e8f0' }}
                    />
                    <Area type="monotone" dataKey="total" stroke="#0f766e" strokeWidth={2} fill="url(#grad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-slate-900">Mais vendidos</h2>
                <Link to="/relatorios" className="text-sm font-medium text-brand-700 hover:underline">
                  Ver relatório
                </Link>
              </div>
              {top.data?.length === 0 && <Vazio>Nenhuma venda no período.</Vazio>}
              <ol className="mt-4 space-y-3">
                {top.data?.map((p, i) => {
                  const max = top.data![0]!.quantidade || 1;
                  return (
                    <li key={p.produtoId}>
                      <div className="flex justify-between gap-2 text-sm">
                        <span className="truncate">
                          <span className="mr-2 text-slate-400">{i + 1}.</span>
                          {p.nome}
                        </span>
                        <span className="shrink-0 font-medium">{num(p.quantidade)} un</span>
                      </div>
                      <div className="mt-1.5 h-1.5 rounded-full bg-slate-100">
                        <div className="h-1.5 rounded-full bg-brand-500" style={{ width: `${(p.quantidade / max) * 100}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        </>
      )}

      <div className="card mt-6">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-500" />
            <h2 className="font-semibold text-slate-900">Alertas de estoque baixo</h2>
            {alertas.data && <Badge cor={alertas.data.length ? 'vermelho' : 'verde'}>{alertas.data.length}</Badge>}
          </div>
          <Link to="/produtos?abaixoMinimo=true" className="text-sm font-medium text-brand-700 hover:underline">
            Ver produtos
          </Link>
        </div>
        {alertas.data?.length === 0 && <Vazio>Nenhum produto abaixo do estoque mínimo. 🎉</Vazio>}
        <ul className="divide-y divide-slate-100">
          {alertas.data?.map((a) => (
            <li key={a.produtoId} className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{a.nome}</p>
                <p className="text-xs text-slate-500">
                  {a.sku} · {a.categoria}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3 text-right">
                <div className="text-xs text-slate-500">
                  <span className="text-sm font-semibold text-slate-900">{a.estoqueAtual}</span> / mín. {a.estoqueMinimo}
                </div>
                <Badge cor={a.situacao === 'ZERADO' ? 'vermelho' : 'amarelo'}>{a.situacao === 'ZERADO' ? 'Zerado' : 'Baixo'}</Badge>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
