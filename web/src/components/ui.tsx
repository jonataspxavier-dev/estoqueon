import { useEffect, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react';

export function PageHeader({ titulo, subtitulo, acoes }: { titulo: string; subtitulo?: string; acoes?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{titulo}</h1>
        {subtitulo && <p className="mt-1 text-sm text-slate-500">{subtitulo}</p>}
      </div>
      {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
    </div>
  );
}

export function Spinner({ className = '' }: { className?: string }) {
  return <Loader2 className={`animate-spin text-brand-600 ${className}`} size={20} />;
}

export function Carregando() {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
      <Spinner /> Carregando...
    </div>
  );
}

export function Erro({ mensagem }: { mensagem: string }) {
  return <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{mensagem}</div>;
}

export function Vazio({ children }: { children: ReactNode }) {
  return <div className="py-12 text-center text-sm text-slate-500">{children}</div>;
}

const cores = {
  verde: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  vermelho: 'bg-red-50 text-red-700 ring-red-600/20',
  amarelo: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  azul: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  cinza: 'bg-slate-100 text-slate-600 ring-slate-500/20',
};
export function Badge({ cor = 'cinza', children }: { cor?: keyof typeof cores; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${cores[cor]}`}>
      {children}
    </span>
  );
}

export function Paginacao({
  page,
  totalPages,
  total,
  onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onChange: (p: number) => void;
}) {
  return (
    <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
      <span>
        {total} registro{total === 1 ? '' : 's'}
      </span>
      <div className="flex items-center gap-2">
        <button className="btn-ghost px-2" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Página anterior">
          <ChevronLeft size={16} />
        </button>
        <span>
          {page} / {totalPages}
        </span>
        <button
          className="btn-ghost px-2"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          aria-label="Próxima página"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

export function Modal({
  aberto,
  titulo,
  onFechar,
  children,
  largura = 'max-w-lg',
}: {
  aberto: boolean;
  titulo: string;
  onFechar: () => void;
  children: ReactNode;
  largura?: string;
}) {
  useEffect(() => {
    if (!aberto) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onFechar();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [aberto, onFechar]);

  if (!aberto) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4" onClick={onFechar}>
      <div
        role="dialog"
        aria-modal="true"
        className={`card max-h-[92vh] w-full overflow-y-auto rounded-b-none sm:rounded-xl ${largura}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-900">{titulo}</h2>
          <button className="btn-ghost p-1.5" onClick={onFechar} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function StatCard({
  titulo,
  valor,
  detalhe,
  icone,
  destaque,
}: {
  titulo: string;
  valor: string;
  detalhe?: ReactNode;
  icone: ReactNode;
  destaque?: 'alerta';
}) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-slate-500">{titulo}</p>
          <p className={`mt-1 truncate text-2xl font-bold ${destaque === 'alerta' ? 'text-red-600' : 'text-slate-900'}`}>{valor}</p>
        </div>
        <div
          className={`rounded-lg p-2.5 ${destaque === 'alerta' ? 'bg-red-50 text-red-600' : 'bg-brand-50 text-brand-700'}`}
        >
          {icone}
        </div>
      </div>
      {detalhe && <p className="mt-3 text-xs text-slate-500">{detalhe}</p>}
    </div>
  );
}

export function SeletorPeriodo({ dias, onChange }: { dias: number; onChange: (d: number) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 text-sm">
      {[7, 30, 90].map((d) => (
        <button
          key={d}
          onClick={() => onChange(d)}
          className={`cursor-pointer rounded-md px-3 py-1.5 font-medium transition ${
            dias === d ? 'bg-brand-700 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          {d} dias
        </button>
      ))}
    </div>
  );
}
