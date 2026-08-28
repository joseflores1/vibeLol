import { prisma } from '../lib/client.js';
import type { SearchSuggestQuery } from '../validators/search.validator.js';

export interface SummonerSuggestion {
  gameName: string;
  tagLine: string;
}

export const searchService = {
  // Autocomplete over the cached Account table. No Riot call — suggestions
  // only cover players who have been searched (or appeared as a cached
  // participant's account) before. Case-insensitive prefix match, most
  // recently updated first (fresh Riot IDs win over stale ones).
  async suggest(query: SearchSuggestQuery): Promise<SummonerSuggestion[]> {
    const accounts = await prisma.account.findMany({
      where: {
        gameName: { contains: query.q, mode: 'insensitive' },
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
      select: { gameName: true, tagLine: true },
    });
    return accounts;
  },
};
