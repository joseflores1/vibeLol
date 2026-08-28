import { prisma } from '../lib/client.js';
import type { Account } from '../generated/prisma/client.js';
import { getByRiotId } from '../riot/account.api.js';
import { getByPuuid, type RiotSummoner } from '../riot/summoner.api.js';
import type { RiotRegion } from '../riot/client.js';
import { isStale, TTL } from '../lib/staleness.js';
import { clusterFromRegion } from '../constants/regions.js';

// Shared Riot-ID-first helper: reads a fresh Account cache row when available,
// otherwise resolves the Riot ID through Account v1 and persists it. Always
// returns the persisted Postgres row (same shape on hit and miss). Used by
// league, mastery, match, and summoner services.
// Throws Riot 404s as ApiError.notFound (propagated from riotGet).
export async function resolveAndCacheAccount(
  region: RiotRegion,
  gameName: string,
  tagLine: string,
): Promise<Account> {
  const cached = await prisma.account.findUnique({
    where: { gameName_tagLine: { gameName, tagLine } },
  });
  if (cached && !isStale(cached.updatedAt, TTL.account)) return cached;

  const riotAccount = await getByRiotId(clusterFromRegion(region), gameName, tagLine);
  return prisma.account.upsert({
    where: { puuid: riotAccount.puuid },
    create: {
      puuid: riotAccount.puuid,
      gameName: riotAccount.gameName,
      tagLine: riotAccount.tagLine,
      region,
    },
    update: {
      gameName: riotAccount.gameName,
      tagLine: riotAccount.tagLine,
      region,
    },
  });
}

// Business logic and database access for the Summoner entity.
// Orchestrates the Riot-ID-first flow Riot recommends:
//   Riot ID → Account v1 (puuid) → Summoner v4 by-puuid (summonerId).
// All results are upserted to Postgres (idempotent on refetch).
// Throws ApiError for expected failures so controllers stay thin.
export const summonerService = {
  // Resolves a Riot ID (gameName#tagLine) + region to a combined
  // { account, summoner } payload. The region is required because
  // Summoner v4 is region-routed and a Riot ID alone doesn't tell you
  // the region (matches op.gg/lolalytics UX: user picks a region).
  async findByRiotId(region: RiotRegion, gameName: string, tagLine: string) {
    const account = await resolveAndCacheAccount(region, gameName, tagLine);

    const cachedSummoner = await prisma.summoner.findUnique({
      where: { puuid: account.puuid },
    });
    if (
      cachedSummoner
      && cachedSummoner.region === region
      && !isStale(cachedSummoner.updatedAt, TTL.summoner)
    ) {
      return { account, summoner: cachedSummoner };
    }

    const riotSummoner: RiotSummoner = await getByPuuid(region, account.puuid);
    const summoner = await prisma.summoner.upsert({
      where: { puuid: riotSummoner.puuid },
      create: {
        puuid: riotSummoner.puuid,
        summonerId: riotSummoner.id,
        name: riotSummoner.name,
        summonerLevel: riotSummoner.summonerLevel,
        profileIconId: riotSummoner.profileIconId,
        revisionDate: new Date(riotSummoner.revisionDate),
        region,
      },
      update: {
        summonerId: riotSummoner.id,
        name: riotSummoner.name,
        summonerLevel: riotSummoner.summonerLevel,
        profileIconId: riotSummoner.profileIconId,
        revisionDate: new Date(riotSummoner.revisionDate),
        region,
      },
    });

    return { account, summoner };
  },
};
