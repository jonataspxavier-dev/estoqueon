import { Prisma } from '@prisma/client';
import { env } from '../config/env';

export type Paginated<T> = {
  data: T[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
};

export function paginate<T>(data: T[], total: number, page: number, pageSize: number): Paginated<T> {
  return { data, meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } };
}

/** Converte Decimal do Prisma para number com 2 casas */
export function money(value: Prisma.Decimal | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Math.round(Number(value) * 100) / 100;
}

// ---------- Datas no fuso da loja (APP_TZ_OFFSET) ----------
// O banco guarda tudo em UTC; "dia" para o usuário é o dia no fuso da loja.

const TZ = env.APP_TZ_OFFSET;
const OFFSET_MS = (TZ.startsWith('-') ? -1 : 1) * (Number(TZ.slice(1, 3)) * 60 + Number(TZ.slice(4, 6))) * 60_000;

/** Horário do instante `d` no fuso da loja, no formato "AAAA-MM-DD HH:MM:SS" */
export function dataHoraLocal(d: Date = new Date()): string {
  return new Date(d.getTime() + OFFSET_MS).toISOString().slice(0, 19).replace('T', ' ');
}

/** Dia (AAAA-MM-DD) do instante `d` no fuso da loja */
export function diaLocal(d: Date = new Date()): string {
  return dataHoraLocal(d).slice(0, 10);
}

function somarDias(dia: string, dias: number): string {
  const d = new Date(`${dia}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Lista os dias de `de` até `ate` (inclusive), limitada a 366 dias */
export function diasEntre(de: string, ate: string): string[] {
  const dias: string[] = [];
  for (let dia = de; dia <= ate && dias.length < 366; dia = somarDias(dia, 1)) dias.push(dia);
  return dias;
}

/**
 * Período [de, ate] inclusivo, com os dias interpretados no fuso da loja.
 * Padrão: os últimos 30 dias, terminando hoje.
 */
export function periodo(de?: string, ate?: string) {
  const ateDia = ate ?? diaLocal();
  const deDia = de ?? somarDias(ateDia, -29);
  return {
    de: deDia,
    ate: ateDia,
    inicio: new Date(`${deDia}T00:00:00.000${TZ}`),
    fim: new Date(`${ateDia}T23:59:59.999${TZ}`),
  };
}
