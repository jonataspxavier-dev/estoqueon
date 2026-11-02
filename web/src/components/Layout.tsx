import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { ArrowLeftRight, BarChart3, LayoutDashboard, LogOut, Menu, Package, Receipt, ShoppingCart, X } from 'lucide-react';
import { useAuth } from '../lib/auth';

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/nova-venda', label: 'Nova venda', icon: ShoppingCart },
  { to: '/vendas', label: 'Vendas', icon: Receipt },
  { to: '/produtos', label: 'Produtos', icon: Package },
  { to: '/movimentacoes', label: 'Movimentações', icon: ArrowLeftRight },
  { to: '/relatorios', label: 'Relatórios', icon: BarChart3 },
];

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <img src="/favicon.svg" alt="" className="h-8 w-8" />
      <span className="text-lg font-bold tracking-tight text-white">EstoqueOn</span>
    </div>
  );
}

export function Layout() {
  const { usuario, sair } = useAuth();
  const [menuAberto, setMenuAberto] = useState(false);
  const { pathname } = useLocation();
  const [ultimoPath, setUltimoPath] = useState(pathname);
  if (pathname !== ultimoPath) {
    setUltimoPath(pathname);
    setMenuAberto(false);
  }

  const nav = (
    <nav className="flex flex-1 flex-col gap-1">
      {links.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
              isActive ? 'bg-white/15 text-white' : 'text-brand-100 hover:bg-white/10 hover:text-white'
            }`
          }
        >
          <Icon size={18} />
          {label}
        </NavLink>
      ))}
    </nav>
  );

  const rodape = (
    <div className="border-t border-white/15 pt-4">
      <p className="truncate text-sm font-medium text-white">{usuario?.nome}</p>
      <p className="text-xs text-brand-100">{usuario?.perfil === 'GERENTE' ? 'Gerente' : 'Vendedor'}</p>
      <button onClick={sair} className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-brand-100 hover:text-white">
        <LogOut size={16} /> Sair
      </button>
    </div>
  );

  return (
    <div className="min-h-screen lg:pl-64">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col gap-8 bg-brand-900 p-5 lg:flex">
        <Logo />
        {nav}
        {rodape}
      </aside>

      {/* Topo mobile */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-brand-900 px-4 py-3 lg:hidden">
        <Logo />
        <button onClick={() => setMenuAberto(true)} className="cursor-pointer p-1 text-white" aria-label="Abrir menu">
          <Menu size={24} />
        </button>
      </header>

      {menuAberto && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setMenuAberto(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col gap-8 bg-brand-900 p-5">
            <div className="flex items-center justify-between">
              <Logo />
              <button onClick={() => setMenuAberto(false)} className="cursor-pointer text-white" aria-label="Fechar menu">
                <X size={22} />
              </button>
            </div>
            {nav}
            {rodape}
          </aside>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <Outlet />
      </main>
    </div>
  );
}
