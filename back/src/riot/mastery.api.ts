import { z } from 'zod';
import { riotGet, type RiotRegion } from './client.js';

// Champion Mastery v4 entry. Puuid-routed (region-routed); works cleanly
// with dev keys (verified real Garen#NA1 returns 91 entries).
// We persist the essential fields; the nested `nextSeasonMilestone` JSON
// is dropped — it's UI-helper data, not needed for the stats page.
export const masteryEntrySchema = z.object({
  puuid: z.string(),
  championId: z.number(),
  championLevel: z.number(),
  championPoints: z.number(),
  lastPlayTime: z.number(),
  championPointsSinceLastLevel: z.number().nullable().optional(),
  championPointsUntilNextLevel: z.number().nullable().optional(),
  markRequiredForNextLevel: z.number().nullable().optional(),
  tokensEarned: z.number().nullable().optional(),
  championSeasonMilestone: z.number().nullable().optional(),
});

export type RiotMasteryEntry = z.infer<typeof masteryEntrySchema>;

// Champion Mastery v4 is region-routed (na1/euw1/kr/…).
// Full list endpoint: /lol/champion-mastery/v4/champion-masteries/by-puuid/{puuid}
export async function getByPuuid(
  region: RiotRegion,
  puuid: string,
): Promise<RiotMasteryEntry[]> {
  const path = `/lol/champion-mastery/v4/champion-masteries/by-puuid/${encodeURIComponent(puuid)}`;
  const data = await riotGet<unknown>(region, path);
  return z.array(masteryEntrySchema).parse(data);
}

// Single-champion lookup endpoint:
// /lol/champion-mastery/v4/champion-masteries/by-puuid/{puuid}/by-champion/{championId}
// Returns a single entry (Riot returns 404 if the player has no mastery
// for that champion — surfaces as ApiError.notFound via riotGet).
export async function getByChampion(
  region: RiotRegion,
  puuid: string,
  championId: number,
): Promise<RiotMasteryEntry> {
  const path = `/lol/champion-mastery/v4/champion-masteries/by-puuid/${encodeURIComponent(puuid)}/by-champion/${encodeURIComponent(championId)}`;
  const data = await riotGet<unknown>(region, path);
  return masteryEntrySchema.parse(data);
}