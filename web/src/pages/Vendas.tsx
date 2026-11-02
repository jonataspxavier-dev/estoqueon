import { useState } from 'react';
import { qs } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useApi } from '../lib/hooks';
import { brl, dataHora } from '../lib/format';
import type { Paginated, Venda } from '../lib/types';
import { Carregando, Erro, Modal, PageHeader, Paginacao, Vazio } from '../components/ui';

export function Vendas() {
  const { isGerente } = useAuth();
  const [page, setPage] = useState(1);
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const lista = useApi<Paginated<Venda>>(`/vendas${qs({ de, ate, page, pageSize: 15 })}`);
  const [detalhe, setDetalhe] = useState<Venda | null>(null);

  return (
    <>
      <PageHeader titulo="Vendas" subtitulo={isGerente ? 'Todas as vendas da loja' : 'Suas vendas'} />

      <div className="card mb-4 flex flex-wrap items-end gap-3 p-4">
        <div>
          <label className="label">De</label>
          <input type="date" className="input" value={de} onChange={(e) => (setDe(e.target.value), setPage(1))} />
        </div>
        <div>
          <label className="label">Até</label>
          <input type="date" className="input" value={ate} onChange={(e) => (setAte(e.target.value), setPage(1))} />
        </div>
        {(de || ate) && (
          <button className="btn-ghost" onClick={() => (setDe(''), setAte(''))}>
            Limpar
          </button>
        )}
      </div>

      {lista.erro && <Erro mensagem={lista.erro} />}
      <div className="card overflow-hidden">
        {!lista.data && lista.carregando && <Carregando />}
        {lista.data?.data.length === 0 && <Vazio>Nenhuma venda no período.</Vazio>}
        <ul className="divide-y divide-slate-100">
          {lista.data?.data.map((v) => (
            <li key={v.id}>
              <button className="flex w-full cursor-pointer items-center justify-between gap-3 px-5 py-3 text-left hover:bg-slate-50" onClick={() => setDetalhe(v)}>
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    Venda #{v.id} <span className="font-normal text-slate-500">· {v.usuario.nome}</span>
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {dataHora(v.criadoEm)} · {v.itens.map((i) => `${i.quantidade}× ${i.produto.nome}`).join(', ')}
                  </p>
                </div>
                <span className="shrink-0 font-semibold">{brl(v.total)}</span>
              </button>
            </li>
          ))}
        </ul>
        {lista.data && lista.data.meta.total > 0 && (
          <Paginacao page={page} totalPages={lista.data.meta.totalPages} total={lista.data.meta.total} onChange={setPage} />
        )}
      </div>

      <Modal aberto={!!detalhe} titulo={`Venda #${detalhe?.id ?? ''}`} onFechar={() => setDetalhe(null)}>
        {detalhe && (
          <>
            <p className="text-sm text-slate-500">
              {dataHora(detalhe.criadoEm)} · {detalhe.usuario.nome}
            </p>
            <table className="mt-4 w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="th px-0">Produto</th>
                  <th className="th text-right">Qtd</th>
                  <th className="th px-0 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {detalhe.itens.map((i) => (
                  <tr key={i.id}>
                    <td className="py-2.5 text-sm">
                      {i.produto.nome}
                      <span className="block text-xs text-slate-500">{brl(i.precoUnitario)} cada</span>
                    </td>
                    <td className="td text-right">{i.quantidade}</td>
                    <td className="py-2.5 text-right text-sm">{brl(i.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 flex justify-between border-t border-slate-200 pt-4 font-semibold">
              <span>Total</span>
              <span>{brl(detalhe.total)}</span>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
