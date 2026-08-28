import { prisma } from '../lib/client.js';
import type { SearchSuggestQuery } from '../validators/search.validator.js';

export interface SummonerSuggestion {
  gameName: string;
  tagLine: string;
  // Profile icon for autocomplete rendering. Null when the account is
  // cached but has no Summoner row yet (e.g. seen only as a participant).
  profileIconId: number | null;
}

export const searchService = {
  // Autocomplete over the cached Account table. No Riot call — suggestions
  // only cover players who have been searched (or appeared as a cached
  // participant's account) before. Case-insensitive prefix match, most
  // recently updated first (fresh Riot IDs win over stale ones). Joins the
  // Summoner row for the profile icon; accounts without one stay suggestible.
  async suggest(query: SearchSuggestQuery): Promise<SummonerSuggestion[]> {
    const accounts = await prisma.account.findMany({
      where: {
        gameName: { contains: query.q, mode: 'insensitive' },
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
      select: {
        gameName: true,
        tagLine: true,
        summoner: { select: { profileIconId: true } },
      },
    });
    return accounts.map((account) => ({
      gameName: account.gameName,
      tagLine: account.tagLine,
      profileIconId: account.summoner?.profileIconId ?? null,
    }));
  },
};
