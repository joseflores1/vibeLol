import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  accountFindMany: vi.fn(),
}));

vi.mock('../lib/client.js', () => ({
  prisma: {
    account: { findMany: mocks.accountFindMany },
  },
}));

import { searchService } from './search.service.js';

describe('searchService.suggest', () => {
  beforeEach(() => vi.clearAllMocks());

  it('queries the Account cache with an insensitive prefix match, capped at 10', async () => {
    const rows = [
      { gameName: 'Faker', tagLine: 'KR1', summoner: { profileIconId: 5764 } },
      { gameName: 'fakerette', tagLine: 'EUW', summoner: null },
    ];
    mocks.accountFindMany.mockResolvedValue(rows);

    const result = await searchService.suggest({ q: 'Faker' });

    expect(result).toEqual([
      { gameName: 'Faker', tagLine: 'KR1', profileIconId: 5764 },
      { gameName: 'fakerette', tagLine: 'EUW', profileIconId: null },
    ]);
    expect(mocks.accountFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { gameName: { contains: 'Faker', mode: 'insensitive' } },
        orderBy: { updatedAt: 'desc' },
        take: 10,
        select: {
          gameName: true,
          tagLine: true,
          summoner: { select: { profileIconId: true } },
        },
      }),
    );
  });

  it('returns an empty list when nothing matches', async () => {
    mocks.accountFindMany.mockResolvedValue([]);

    await expect(searchService.suggest({ q: 'zzzz' })).resolves.toEqual([]);
  });
});
