import { prisma } from '../lib/client.js';
import { ApiError } from '../utils/ApiError.js';
import { getByRiotId, type RiotAccount } from '../riot/account.api.js';
import { getByPuuid, type RiotSummoner } from '../riot/summoner.api.js';
import type { RiotCluster, RiotRegion } from '../riot/client.js';

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
    // 1. Account v1 — cluster-routed, returns puuid.
    let riotAccount: RiotAccount;
    try {
      riotAccount = await getByRiotId(
        clusterFromRegion(region),
        gameName,
        tagLine,
      );
    } catch (err) {
      // 404s from Riot surface as ApiError.notFound — let them propagate.
      throw err;
    }

    // 2. Summoner v4 — region-routed, keyed by puuid.
    let riotSummoner: RiotSummoner;
    try {
      riotSummoner = await getByPuuid(region, riotAccount.puuid);
    } catch (err) {
      // A 404 here means the account has no summoner profile (rare but
      // possible for brand-new accounts). Surface as notFound.
      throw err;
    }

    // 3. Persist both in a transaction. Account.region is filled now that
    // we know the region; Summoner is upserted keyed on summonerId.
    const account = await prisma.account.upsert({
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