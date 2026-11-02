import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeftRight, Pencil, Plus, Search, Tags, Trash2 } from 'lucide-react';
import { api, qs } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useApi, useDebounce } from '../lib/hooks';
import { brl, num, pct } from '../lib/format';
import type { Categoria, Paginated, Produto, TipoMov } from '../lib/types';
import { Badge, Carregando, Erro, Modal, PageHeader, Paginacao, Vazio } from '../components/ui';

export function Produtos() {
  const { isGerente } = useAuth();
  const [params, setParams] = useSearchParams();
  const [busca, setBusca] = useState(params.get('busca') ?? '');
  const buscaDebounced = useDebounce(busca);
  const categoria = params.get('categoria') ?? '';
  const abaixoMinimo = params.get('abaixoMinimo') === 'true';
  const page = Number(params.get('page') ?? 1);

  const lista = useApi<Paginated<Produto>>(
    `/produtos${qs({ busca: buscaDebounced, categoria, abaixoMinimo: abaixoMinimo || undefined, page, pageSize: 15 })}`,
  );
  const categorias = useApi<Categoria[]>('/categorias');

  const [editando, setEditando] = useState<Produto | 'novo' | null>(null);
  const [movimentando, setMovimentando] = useState<Produto | null>(null);
  const [gerenciarCategorias, setGerenciarCategorias] = useState(false);

  const setFiltro = (k: string, v: string) => {
    const p = new URLSearchParams(params);
    if (v) p.set(k, v);
    else p.delete(k);
    if (k !== 'page') p.delete('page');
    setParams(p, { replace: true });
  };

  async function desativar(p: Produto) {
    if (!confirm(`Desativar "${p.nome}"? Ele deixará de aparecer nas vendas.`)) return;
    try {
      await api.del(`/produtos/${p.id}`);
      void lista.recarregar();
    } catch (e) {
      alert((e as Error).message);
    }
  }

  return (
    <>
      <PageHeader
        titulo="Produtos"
        subtitulo="Catálogo, preços e níveis de estoque"
        acoes={
          isGerente && (
            <>
              <button className="btn-secondary" onClick={() => setGerenciarCategorias(true)}>
                <Tags size={16} /> Categorias
              </button>
              <button className="btn-primary" onClick={() => setEditando('novo')}>
                <Plus size={16} /> Novo produto
              </button>
            </>
          )
        }
      />

      <div className="card mb-4 grid gap-3 p-4 sm:grid-cols-[1fr_200px_auto]">
        <div className="relative">
          <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Buscar por nome ou SKU"
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              if (page !== 1) setFiltro('page', '');
            }}
          />
        </div>
        <select className="input" value={categoria} onChange={(e) => setFiltro('categoria', e.target.value)}>
          <option value="">Todas as categorias</option>
          {categorias.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            className="h-4 w-4 accent-brand-700"
            checked={abaixoMinimo}
            onChange={(e) => setFiltro('abaixoMinimo', e.target.checked ? 'true' : '')}
          />
          Só abaixo do mínimo
        </label>
      </div>

      {lista.erro && <Erro mensagem={lista.erro} />}
      <div className="card overflow-hidden">
        {!lista.data && lista.carregando && <Carregando />}
        {lista.data?.data.length === 0 && <Vazio>Nenhum produto encontrado.</Vazio>}

        {/* Tabela (desktop) */}
        {!!lista.data?.data.length && (
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">Produto</th>
                  <th className="th">Categoria</th>
                  <th className="th text-right">Custo</th>
                  <th className="th text-right">Venda</th>
                  <th className="th text-right">Margem</th>
                  <th className="th text-right">Estoque</th>
                  {isGerente && <th className="th text-right">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lista.data.data.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60">
                    <td className="td">
                      <p className="font-medium text-slate-900">{p.nome}</p>
                      <p className="text-xs text-slate-500">{p.sku}</p>
                    </td>
                    <td className="td text-slate-600">{p.categoria?.nome}</td>
                    <td className="td text-right text-slate-600">{brl(p.precoCusto)}</td>
                    <td className="td text-right font-medium">{brl(p.precoVenda)}</td>
                    <td className="td text-right text-slate-600">{pct(p.margem)}</td>
                    <td className="td text-right">
                      <EstoqueBadge p={p} />
                    </td>
                    {isGerente && (
                      <td className="td">
                        <div className="flex justify-end gap-1">
                          <button className="btn-ghost p-2" title="Movimentar estoque" onClick={() => setMovimentando(p)}>
                            <ArrowLeftRight size={16} />
                          </button>
                          <button className="btn-ghost p-2" title="Editar" onClick={() => setEditando(p)}>
                            <Pencil size={16} />
                          </button>
                          <button className="btn-ghost p-2 text-red-600" title="Desativar" onClick={() => desativar(p)}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Cards (mobile) */}
        <ul className="divide-y divide-slate-100 md:hidden">
          {lista.data?.data.map((p) => (
            <li key={p.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">{p.nome}</p>
                  <p className="text-xs text-slate-500">
                    {p.sku} · {p.categoria?.nome}
                  </p>
                </div>
                <EstoqueBadge p={p} />
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span>
                  <span className="font-semibold">{brl(p.precoVenda)}</span>
                  <span className="ml-2 text-xs text-slate-500">custo {brl(p.precoCusto)}</span>
                </span>
                {isGerente && (
                  <div className="flex gap-1">
                    <button className="btn-ghost p-2" onClick={() => setMovimentando(p)} aria-label="Movimentar">
                      <ArrowLeftRight size={16} />
                    </button>
                    <button className="btn-ghost p-2" onClick={() => setEditando(p)} aria-label="Editar">
                      <Pencil size={16} />
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>

        {lista.data && lista.data.meta.total > 0 && (
          <Paginacao
            page={lista.data.meta.page}
            totalPages={lista.data.meta.totalPages}
            total={lista.data.meta.total}
            onChange={(p) => setFiltro('page', String(p))}
          />
        )}
      </div>

      {editando && (
        <ProdutoForm
          produto={editando === 'novo' ? null : editando}
          categorias={categorias.data ?? []}
          onFechar={() => setEditando(null)}
          onSalvo={() => {
            setEditando(null);
            void lista.recarregar();
          }}
        />
      )}
      {movimentando && (
        <MovimentacaoForm
          produto={movimentando}
          onFechar={() => setMovimentando(null)}
          onSalvo={() => {
            setMovimentando(null);
            void lista.recarregar();
          }}
        />
      )}
      <CategoriasModal
        aberto={gerenciarCategorias}
        categorias={categorias.data ?? []}
        onFechar={() => setGerenciarCategorias(false)}
        onAlterado={() => void categorias.recarregar()}
      />
    </>
  );
}

function EstoqueBadge({ p }: { p: Produto }) {
  const cor = p.estoqueAtual === 0 ? 'vermelho' : p.abaixoMinimo ? 'amarelo' : 'verde';
  return (
    <span className="inline-flex flex-col items-end">
      <Badge cor={cor}>{num(p.estoqueAtual)} un</Badge>
      <span className="mt-0.5 text-[11px] text-slate-400">mín. {p.estoqueMinimo}</span>
    </span>
  );
}

function ProdutoForm({
  produto,
  categorias,
  onFechar,
  onSalvo,
}: {
  produto: Produto | null;
  categorias: Categoria[];
  onFechar: () => void;
  onSalvo: () => void;
}) {
  const [f, setF] = useState({
    sku: produto?.sku ?? '',
    nome: produto?.nome ?? '',
    categoriaId: String(produto?.categoriaId ?? categorias[0]?.id ?? ''),
    precoCusto: String(produto?.precoCusto ?? ''),
    precoVenda: String(produto?.precoVenda ?? ''),
    estoqueAtual: '0',
    estoqueMinimo: String(produto?.estoqueMinimo ?? '0'),
  });
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  const dec = (v: string) => Number(v.replace(',', '.'));

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setSalvando(true);
    const body = {
      sku: f.sku,
      nome: f.nome,
      categoriaId: Number(f.categoriaId),
      precoCusto: dec(f.precoCusto),
      precoVenda: dec(f.precoVenda),
      estoqueMinimo: Number(f.estoqueMinimo),
      ...(produto ? {} : { estoqueAtual: Number(f.estoqueAtual) }),
    };
    try {
      if (produto) await api.put(`/produtos/${produto.id}`, body);
      else await api.post('/produtos', body);
      onSalvo();
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal aberto titulo={produto ? 'Editar produto' : 'Novo produto'} onFechar={onFechar}>
      <form onSubmit={salvar} className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">SKU</label>
          <input className="input uppercase" value={f.sku} onChange={set('sku')} required />
        </div>
        <div>
          <label className="label">Categoria</label>
          <select className="input" value={f.categoriaId} onChange={set('categoriaId')} required>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <label className="label">Nome</label>
          <input className="input" value={f.nome} onChange={set('nome')} required />
        </div>
        <div>
          <label className="label">Preço de custo (R$)</label>
          <input className="input" inputMode="decimal" value={f.precoCusto} onChange={set('precoCusto')} required />
        </div>
        <div>
          <label className="label">Preço de venda (R$)</label>
          <input className="input" inputMode="decimal" value={f.precoVenda} onChange={set('precoVenda')} required />
        </div>
        {!produto && (
          <div>
            <label className="label">Estoque inicial</label>
            <input className="input" type="number" min={0} value={f.estoqueAtual} onChange={set('estoqueAtual')} />
          </div>
        )}
        <div className={produto ? 'col-span-2' : ''}>
          <label className="label">Estoque mínimo</label>
          <input className="input" type="number" min={0} value={f.estoqueMinimo} onChange={set('estoqueMinimo')} />
        </div>
        {produto && (
          <p className="col-span-2 text-xs text-slate-500">
            Para alterar a quantidade em estoque, use <strong>Movimentar estoque</strong> — assim tudo fica no histórico.
          </p>
        )}
        {erro && (
          <div className="col-span-2">
            <Erro mensagem={erro} />
          </div>
        )}
        <div className="col-span-2 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onFechar}>
            Cancelar
          </button>
          <button className="btn-primary" disabled={salvando}>
            Salvar
          </button>
        </div>
      </form>
    </Modal>
  );
}

const tipos: { valor: TipoMov; label: string; ajuda: string }[] = [
  { valor: 'ENTRADA', label: 'Entrada', ajuda: 'Compra ou devolução: soma ao estoque.' },
  { valor: 'SAIDA', label: 'Saída', ajuda: 'Perda, avaria ou consumo: subtrai do estoque.' },
  { valor: 'AJUSTE', label: 'Ajuste', ajuda: 'Inventário: informe a quantidade contada.' },
];

function MovimentacaoForm({ produto, onFechar, onSalvo }: { produto: Produto; onFechar: () => void; onSalvo: () => void }) {
  const [tipo, setTipo] = useState<TipoMov>('ENTRADA');
  const [quantidade, setQuantidade] = useState('');
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const q = Number(quantidade || 0);
  const previsto = tipo === 'ENTRADA' ? produto.estoqueAtual + q : tipo === 'SAIDA' ? produto.estoqueAtual - q : q;

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setSalvando(true);
    try {
      await api.post('/movimentacoes', { produtoId: produto.id, tipo, quantidade: q, motivo });
      onSalvo();
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal aberto titulo="Movimentar estoque" onFechar={onFechar}>
      <p className="mb-4 text-sm">
        <span className="font-medium">{produto.nome}</span> <span className="text-slate-500">· atual: {produto.estoqueAtual} un</span>
      </p>
      <form onSubmit={salvar} className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {tipos.map((t) => (
            <button
              type="button"
              key={t.valor}
              onClick={() => setTipo(t.valor)}
              className={`btn border ${tipo === t.valor ? 'border-brand-700 bg-brand-50 text-brand-800' : 'border-slate-300 text-slate-600'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500">{tipos.find((t) => t.valor === tipo)!.ajuda}</p>
        <div>
          <label className="label">{tipo === 'AJUSTE' ? 'Quantidade contada' : 'Quantidade'}</label>
          <input className="input" type="number" min={tipo === 'AJUSTE' ? 0 : 1} value={quantidade} onChange={(e) => setQuantidade(e.target.value)} required />
          {quantidade !== '' && (
            <p className={`mt-1 text-xs ${previsto < 0 ? 'text-red-600' : 'text-slate-500'}`}>Estoque após: {previsto} un</p>
          )}
        </div>
        <div>
          <label className="label">Motivo</label>
          <input className="input" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: Compra NF 1234" required minLength={3} />
        </div>
        {erro && <Erro mensagem={erro} />}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onFechar}>
            Cancelar
          </button>
          <button className="btn-primary" disabled={salvando}>
            Registrar
          </button>
        </div>
      </form>
    </Modal>
  );
}

function CategoriasModal({
  aberto,
  categorias,
  onFechar,
  onAlterado,
}: {
  aberto: boolean;
  categorias: Categoria[];
  onFechar: () => void;
  onAlterado: () => void;
}) {
  const [nome, setNome] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  async function executar(fn: () => Promise<unknown>) {
    setErro(null);
    try {
      await fn();
      onAlterado();
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  return (
    <Modal aberto={aberto} titulo="Categorias" onFechar={onFechar}>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void executar(async () => {
            await api.post('/categorias', { nome });
            setNome('');
          });
        }}
      >
        <input className="input" placeholder="Nova categoria" value={nome} onChange={(e) => setNome(e.target.value)} required />
        <button className="btn-primary">
          <Plus size={16} /> Adicionar
        </button>
      </form>
      {erro && (
        <div className="mt-3">
          <Erro mensagem={erro} />
        </div>
      )}
      <ul className="mt-4 divide-y divide-slate-100">
        {categorias.map((c) => (
          <li key={c.id} className="flex items-center justify-between py-2.5 text-sm">
            <span>
              {c.nome} <span className="text-xs text-slate-400">({c.totalProdutos} produtos)</span>
            </span>
            <div className="flex gap-1">
              <button
                className="btn-ghost p-1.5"
                aria-label="Renomear"
                onClick={() => {
                  const novo = prompt('Novo nome da categoria', c.nome);
                  if (novo && novo !== c.nome) void executar(() => api.put(`/categorias/${c.id}`, { nome: novo }));
                }}
              >
                <Pencil size={15} />
              </button>
              <button
                className="btn-ghost p-1.5 text-red-600"
                aria-label="Excluir"
                onClick={() => confirm(`Excluir a categoria "${c.nome}"?`) && void executar(() => api.del(`/categorias/${c.id}`))}
              >
                <Trash2 size={15} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
