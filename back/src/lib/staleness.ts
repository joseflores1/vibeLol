export const TTL = {
  account: 24 * 60 * 60 * 1000,
  summoner: 24 * 60 * 60 * 1000,
  league: 5 * 60 * 1000,
  mastery: 30 * 60 * 1000,
  matchList: 5 * 60 * 1000,
} as const;

export function isStale(
  updatedAt: Date | string | null | undefined,
  ttlMs: number,
): boolean {
  if (updatedAt == null) return true;
  const timestamp = typeof updatedAt === 'string'
    ? Date.parse(updatedAt)
    : updatedAt.getTime();
  if (Number.isNaN(timestamp)) return true;
  return Date.now() - timestamp > ttlMs;
}
