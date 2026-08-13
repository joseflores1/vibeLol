import { prisma } from '../lib/client.js';
import { ApiError } from '../utils/ApiError.js';
import { getByRiotId, type RiotAccount } from '../riot/account.api.js';
import { getByPuuid, type RiotSummoner } from '../riot/summoner.api.js';
import type { RiotCluster, RiotRegion } from '../riot/client.js';
import { isStale, TTL } from '../lib/staleness.js';

// Maps a region (na1/euw1/kr/…) to its cluster (americas/europe/asia).
// Per Riot's routing values table. Used to route Account v1 (cluster-routed)
// from a region the caller already knows.
export function clusterFromRegion(region: RiotRegion): RiotCluster {
  switch (region) {
    case 'na1': case 'br1': case 'la1': case 'la2': case 'oc1':
      return 'americas';
    case 'euw1': case 'eun1': case 'tr1': case 'ru':
      return 'europe';
    case 'kr': case 'jp1':
      return 'asia';
    default:
      // SEA cluster (sea.api.riotgames.com) — ph2/sg2/th2/tw2/vn2.
      return 'sea';
  }
}

// Shared Riot-ID-first helper: reads a fresh Account cache row when available,
// otherwise resolves the Riot ID through Account v1 and persists it. Used by
// league, mastery, and match services.
// Throws Riot 404s as ApiError.notFound (propagated from riotGet).
export async function resolveAndCacheAccount(
  region: RiotRegion,
  gameName: string,
  tagLine: string,
): Promise<RiotAccount> {
  const cached = await prisma.account.findUnique({
    where: { gameName_tagLine: { gameName, tagLine } },
  });
  if (cached && !isStale(cached.updatedAt, TTL.account)) return cached;

  const riotAccount = await getByRiotId(clusterFromRegion(region), gameName, tagLine);
  await prisma.account.upsert({
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
  return riotAccount;
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
    const cachedAccount = await prisma.account.findUnique({
      where: { gameName_tagLine: { gameName, tagLine } },
    });
    const account = cachedAccount && !isStale(cachedAccount.updatedAt, TTL.account)
      ? cachedAccount
      : await (async () => {
        const riotAccount = await getByRiotId(
          clusterFromRegion(region),
          gameName,
          tagLine,
        );
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
      })();

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

    if (!account || !summoner) throw ApiError.conflict('Summoner upsert failed');
    return { account, summoner };
  },
};
