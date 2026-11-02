import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './index.css';
import { AuthProvider, useAuth } from './lib/auth';
import { Layout } from './components/Layout';
import { Carregando } from './components/ui';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Produtos } from './pages/Produtos';
import { NovaVenda } from './pages/NovaVenda';
import { Vendas } from './pages/Vendas';
import { Movimentacoes } from './pages/Movimentacoes';
import { Relatorios } from './pages/Relatorios';

function Protegido({ children }: { children: ReactNode }) {
  const { usuario, carregando } = useAuth();
  if (carregando) return <Carregando />;
  return usuario ? children : <Navigate to="/login" replace />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <Protegido>
                <Layout />
              </Protegido>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="nova-venda" element={<NovaVenda />} />
            <Route path="vendas" element={<Vendas />} />
            <Route path="produtos" element={<Produtos />} />
            <Route path="movimentacoes" element={<Movimentacoes />} />
            <Route path="relatorios" element={<Relatorios />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
);
