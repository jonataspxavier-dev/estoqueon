import { useState } from 'react';
import { CheckCircle2, Minus, Plus, Search, ShoppingCart, Trash2 } from 'lucide-react';
import { api, ApiError, qs } from '../lib/api';
import { useApi, useDebounce } from '../lib/hooks';
import { brl } from '../lib/format';
import type { Paginated, Produto, Venda } from '../lib/types';
import { Badge, Erro, PageHeader, Spinner, Vazio } from '../components/ui';

type ItemCarrinho = { produto: Produto; quantidade: number };

export function NovaVenda() {
  const [busca, setBusca] = useState('');
  const termo = useDebounce(busca);
  const resultados = useApi<Paginated<Produto>>(`/produtos${qs({ busca: termo, pageSize: 8 })}`);
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [concluida, setConcluida] = useState<Venda | null>(null);

  const total = carrinho.reduce((s, i) => s + i.produto.precoVenda * i.quantidade, 0);
  const qtdNoCarrinho = (id: number) => carrinho.find((i) => i.produto.id === id)?.quantidade ?? 0;

  function adicionar(p: Produto) {
    setConcluida(null);
    setErro(null);
    setCarrinho((c) => {
      const existente = c.find((i) => i.produto.id === p.id);
      if (existente) return c.map((i) => (i.produto.id === p.id ? { ...i, quantidade: Math.min(i.quantidade + 1, p.estoqueAtual) } : i));
      return [...c, { produto: p, quantidade: 1 }];
    });
  }

  function alterar(id: number, quantidade: number) {
    setCarrinho((c) =>
      c.flatMap((i) => (i.produto.id !== id ? [i] : quantidade <= 0 ? [] : [{ ...i, quantidade: Math.min(quantidade, i.produto.estoqueAtual) }])),
    );
  }

  async function finalizar() {
    setErro(null);
    setEnviando(true);
    try {
      const venda = await api.post<Venda>('/vendas', {
        itens: carrinho.map((i) => ({ produtoId: i.produto.id, quantidade: i.quantidade })),
      });
      setConcluida(venda);
      setCarrinho([]);
      void resultados.recarregar(); // estoque mudou
    } catch (e) {
      const err = e as ApiError;
      const itens = (err.detalhes as { itens?: { nome: string; disponivel: number }[] } | undefined)?.itens;
      setErro(itens ? `${err.message}: ${itens.map((i) => `${i.nome} (disponível: ${i.disponivel})`).join(', ')}` : err.message);
      void resultados.recarregar();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <PageHeader titulo="Nova venda" subtitulo="Busque os produtos, monte o carrinho e finalize" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px] [&>*]:min-w-0">
        <div className="card">
          <div className="border-b border-slate-200 p-4">
            <div className="relative">
              <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
              <input
                autoFocus
                className="input pl-9"
                placeholder="Buscar produto por nome ou SKU"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
          </div>
          {resultados.data?.data.length === 0 && <Vazio>Nenhum produto encontrado.</Vazio>}
          <ul className="divide-y divide-slate-100">
            {resultados.data?.data.map((p) => {
              const disponivel = p.estoqueAtual - qtdNoCarrinho(p.id);
              return (
                <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{p.nome}</p>
                    <p className="text-xs text-slate-500">
                      {p.sku} · {brl(p.precoVenda)} ·{' '}
                      {p.estoqueAtual === 0 ? <Badge cor="vermelho">sem estoque</Badge> : `${p.estoqueAtual} em estoque`}
                    </p>
                  </div>
                  <button className="btn-secondary shrink-0 px-3" disabled={disponivel <= 0} onClick={() => adicionar(p)}>
                    <Plus size={16} /> <span className="hidden sm:inline">Adicionar</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="card flex h-fit flex-col lg:sticky lg:top-8">
          <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
            <ShoppingCart size={18} className="text-brand-700" />
            <h2 className="font-semibold">Carrinho</h2>
            <span className="text-sm text-slate-500">({carrinho.length})</span>
          </div>

          {concluida && (
            <div className="m-4 flex gap-3 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">
              <CheckCircle2 className="shrink-0" size={20} />
              <div>
                <p className="font-semibold">Venda #{concluida.id} registrada!</p>
                <p>Total de {brl(concluida.total)}. Estoque atualizado.</p>
              </div>
            </div>
          )}

          {carrinho.length === 0 && !concluida && <Vazio>Adicione produtos para começar.</Vazio>}

          <ul className="divide-y divide-slate-100">
            {carrinho.map((i) => (
              <li key={i.produto.id} className="px-5 py-3">
                <div className="flex justify-between gap-2">
                  <p className="text-sm font-medium">{i.produto.nome}</p>
                  <button className="text-slate-400 hover:text-red-600" onClick={() => alterar(i.produto.id, 0)} aria-label="Remover">
                    <Trash2 size={15} />
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="inline-flex items-center rounded-lg border border-slate-300">
                    <button className="cursor-pointer px-2 py-1" onClick={() => alterar(i.produto.id, i.quantidade - 1)} aria-label="Diminuir">
                      <Minus size={14} />
                    </button>
                    <input
                      className="w-12 border-x border-slate-300 py-1 text-center text-sm outline-none"
                      type="number"
                      value={i.quantidade}
                      onChange={(e) => alterar(i.produto.id, Number(e.target.value))}
                    />
                    <button
                      className="cursor-pointer px-2 py-1 disabled:opacity-40"
                      disabled={i.quantidade >= i.produto.estoqueAtual}
                      onClick={() => alterar(i.produto.id, i.quantidade + 1)}
                      aria-label="Aumentar"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <span className="text-sm font-semibold">{brl(i.produto.precoVenda * i.quantidade)}</span>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-auto space-y-3 border-t border-slate-200 p-5">
            <div className="flex items-baseline justify-between">
              <span className="text-slate-600">Total</span>
              <span className="text-2xl font-bold text-slate-900">{brl(total)}</span>
            </div>
            {erro && <Erro mensagem={erro} />}
            <button className="btn-primary w-full py-3" disabled={!carrinho.length || enviando} onClick={finalizar}>
              {enviando && <Spinner className="text-white" />} Finalizar venda
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
