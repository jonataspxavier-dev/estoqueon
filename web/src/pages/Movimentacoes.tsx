import { useState } from 'react';
import { qs } from '../lib/api';
import { useApi } from '../lib/hooks';
import { dataHora } from '../lib/format';
import type { Movimentacao, Paginated, TipoMov } from '../lib/types';
import { Badge, Carregando, Erro, PageHeader, Paginacao, Vazio } from '../components/ui';

const corTipo: Record<TipoMov, 'verde' | 'vermelho' | 'azul'> = { ENTRADA: 'verde', SAIDA: 'vermelho', AJUSTE: 'azul' };
const nomeTipo: Record<TipoMov, string> = { ENTRADA: 'Entrada', SAIDA: 'Saída', AJUSTE: 'Ajuste' };

export function Movimentacoes() {
  const [page, setPage] = useState(1);
  const [tipo, setTipo] = useState('');
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const lista = useApi<Paginated<Movimentacao>>(`/movimentacoes${qs({ tipo, de, ate, page, pageSize: 20 })}`);

  const variacao = (m: Movimentacao) => m.estoquePosterior - m.estoqueAnterior;

  return (
    <>
      <PageHeader titulo="Movimentações" subtitulo="Histórico completo de entradas, saídas e ajustes de estoque" />

      <div className="card mb-4 flex flex-wrap items-end gap-3 p-4">
        <div>
          <label className="label">Tipo</label>
          <select className="input" value={tipo} onChange={(e) => (setTipo(e.target.value), setPage(1))}>
            <option value="">Todos</option>
            <option value="ENTRADA">Entrada</option>
            <option value="SAIDA">Saída</option>
            <option value="AJUSTE">Ajuste</option>
          </select>
        </div>
        <div>
          <label className="label">De</label>
          <input type="date" className="input" value={de} onChange={(e) => (setDe(e.target.value), setPage(1))} />
        </div>
        <div>
          <label className="label">Até</label>
          <input type="date" className="input" value={ate} onChange={(e) => (setAte(e.target.value), setPage(1))} />
        </div>
      </div>

      {lista.erro && <Erro mensagem={lista.erro} />}
      <div className="card overflow-hidden">
        {!lista.data && lista.carregando && <Carregando />}
        {lista.data?.data.length === 0 && <Vazio>Nenhuma movimentação encontrada.</Vazio>}
        <ul className="divide-y divide-slate-100">
          {lista.data?.data.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Badge cor={corTipo[m.tipo]}>{nomeTipo[m.tipo]}</Badge>
                  <p className="truncate text-sm font-medium">{m.produto.nome}</p>
                </div>
                <p className="mt-1 truncate text-xs text-slate-500">
                  {dataHora(m.criadoEm)} · {m.motivo} · {m.usuario.nome}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className={`text-sm font-semibold ${variacao(m) < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {variacao(m) > 0 ? '+' : ''}
                  {variacao(m)}
                </p>
                <p className="text-xs text-slate-500">
                  {m.estoqueAnterior} → {m.estoquePosterior}
                </p>
              </div>
            </li>
          ))}
        </ul>
        {lista.data && lista.data.meta.total > 0 && (
          <Paginacao page={page} totalPages={lista.data.meta.totalPages} total={lista.data.meta.total} onChange={setPage} />
        )}
      </div>
    </>
  );
}
