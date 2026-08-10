import { z } from 'zod';
import { riotGet, type RiotRegion } from './client.js';

// League v4 entry — Riot added a puuid-routed endpoint post-Riot-ID
// migration: /lol/league/v4/entries/by-puuid/{puuid}. The legacy
// /by-summoner/{encryptedSummonerId} requires per-key summonerId which
// the /by-puuid Summoner v4 endpoint no longer returns for many accounts.
// Per AGENTS.md §5a: prefer puuid endpoints; never key on summonerId.
export const leagueEntrySchema = z.object({
  leagueId: z.string().nullable().optional(),
  queueType: z.string(),
  tier: z.string(),
  rank: z.string(),
  puuid: z.string(),
  leaguePoints: z.number(),
  wins: z.number(),
  losses: z.number(),
  veteran: z.boolean(),
  inactive: z.boolean(),
  freshBlood: z.boolean(),
  hotStreak: z.boolean(),
});

export type RiotLeagueEntry = z.infer<typeof leagueEntrySchema>;

// League v4 is region-routed (na1/euw1/kr/…). Returns all ranked queue
// entries (solo/duo + flex) for the player. Empty array if unranked.
// Endpoint: /lol/league/v4/entries/by-puuid/{puuid}
export async function getEntriesByPuuid(
  region: RiotRegion,
  puuid: string,
): Promise<RiotLeagueEntry[]> {
  const path = `/lol/league/v4/entries/by-puuid/${encodeURIComponent(puuid)}`;
  const data = await riotGet<unknown>(region, path);
  return z.array(leagueEntrySchema).parse(data);
}