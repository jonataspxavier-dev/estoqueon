import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, setOnUnauthorized, tokenStore } from './api';
import type { Usuario } from './types';

type AuthCtx = {
  usuario: Usuario | null;
  carregando: boolean;
  isGerente: boolean;
  entrar: (email: string, senha: string) => Promise<void>;
  sair: () => void;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);

  const sair = useCallback(() => {
    tokenStore.clear();
    setUsuario(null);
  }, []);

  useEffect(() => {
    setOnUnauthorized(sair);
    if (!tokenStore.get()) {
      setCarregando(false);
      return;
    }
    api
      .get<Usuario>('/auth/me')
      .then(setUsuario)
      .catch(sair)
      .finally(() => setCarregando(false));
  }, [sair]);

  const entrar = async (email: string, senha: string) => {
    const r = await api.post<{ token: string; usuario: Usuario }>('/auth/login', { email, senha });
    tokenStore.set(r.token);
    setUsuario(r.usuario);
  };

  return (
    <Ctx.Provider value={{ usuario, carregando, isGerente: usuario?.perfil === 'GERENTE', entrar, sair }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth fora do AuthProvider');
  return ctx;
}
