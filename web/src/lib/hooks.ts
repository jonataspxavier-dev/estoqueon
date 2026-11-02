import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api';

/** Busca dados de um endpoint GET; recarrega quando `path` muda. */
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(!!path);
  const atual = useRef(path);

  const carregar = useCallback(async () => {
    if (!path) return;
    atual.current = path;
    setCarregando(true);
    setErro(null);
    try {
      const r = await api.get<T>(path);
      if (atual.current === path) setData(r);
    } catch (e) {
      if (atual.current === path) setErro((e as Error).message);
    } finally {
      if (atual.current === path) setCarregando(false);
    }
  }, [path]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  return { data, erro, carregando, recarregar: carregar };
}

export function useDebounce<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
