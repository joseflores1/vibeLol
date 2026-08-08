import { z } from 'zod';
import { riotGet, type RiotPlatform } from './client.js';

// Account v1 response: puuid is the universal Riot identifier used by every
// other endpoint. gameName#tagLine is the user-facing Riot ID.
export const accountSchema = z.object({
  puuid: z.string(),
  gameName: z.string(),
  tagLine: z.string(),
});

export type RiotAccount = z.infer<typeof accountSchema>;

// Account v1 is platform-routed (americas/europe/asia), NOT regional.
// Endpoint: /riot/account/v1/accounts/by-riot-id/{gameName}/{tagLine}
export async function getByRiotId(
  platform: RiotPlatform,
  gameName: string,
  tagLine: string,
): Promise<RiotAccount> {
  const path = `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
  const data = await riotGet<unknown>(platform, path);
  return accountSchema.parse(data);
}