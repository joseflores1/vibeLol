import { z } from 'zod';
import { riotGet, type RiotCluster } from './client.js';

// Account v1 response: puuid is the universal Riot identifier used by every
// other endpoint. gameName#tagLine is the user-facing Riot ID.
export const accountSchema = z.object({
  puuid: z.string(),
  gameName: z.string(),
  tagLine: z.string(),
});

export type RiotAccount = z.infer<typeof accountSchema>;

// Account v1 is cluster-routed (americas/europe/asia), NOT regional.
// Endpoint: /riot/account/v1/accounts/by-riot-id/{gameName}/{tagLine}
export async function getByRiotId(
  cluster: RiotCluster,
  gameName: string,
  tagLine: string,
): Promise<RiotAccount> {
  const path = `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
  const data = await riotGet<unknown>(cluster, path);
  return accountSchema.parse(data);
}