import { Prisma } from '@prisma/client';

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

/** Período [de, ate] inclusivo, em UTC. Padrão: últimos 30 dias. */
export function periodo(de?: string, ate?: string): { inicio: Date; fim: Date } {
  const fim = ate ? new Date(`${ate}T23:59:59.999Z`) : new Date();
  const inicio = de
    ? new Date(`${de}T00:00:00.000Z`)
    : new Date(Date.UTC(fim.getUTCFullYear(), fim.getUTCMonth(), fim.getUTCDate() - 29));
  return { inicio, fim };
}
