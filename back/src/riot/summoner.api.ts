import { z } from 'zod';
import { riotGet, type RiotRegion } from './client.js';

// Summoner v4 response. The puuid echoes Account v1; summonerId (-> id) is
// the routing key for League v4 (which only accepts encryptedSummonerId).
// Per Riot's Riot-ID migration, id/accountId/name are no longer returned
// by the /by-puuid endpoint for many accounts — they're optional here.
export const summonerSchema = z.object({
  id: z.string().optional(),
  accountId: z.string().optional(),
  puuid: z.string(),
  name: z.string().nullable().optional(),
  profileIconId: z.number(),
  revisionDate: z.number(),
  summonerLevel: z.number(),
});

export type RiotSummoner = z.infer<typeof summonerSchema>;

// Summoner v4 is region-routed (na1/euw1/kr/…), NOT cluster-routed.
// We look up by puuid (Riot's recommended endpoint post Riot-ID migration).
// Endpoint: /lol/summoner/v4/summoners/by-puuid/{encryptedPUUID}
export async function getByPuuid(
  region: RiotRegion,
  puuid: string,
): Promise<RiotSummoner> {
  const path = `/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(puuid)}`;
  const data = await riotGet<unknown>(region, path);
  return summonerSchema.parse(data);
}