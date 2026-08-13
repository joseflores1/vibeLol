import { prisma } from '../lib/client.js';
import { getEntriesByPuuid, type RiotLeagueEntry } from '../riot/league.api.js';
import { resolveAndCacheAccount } from './summoner.service.js';
import type { RiotRegion } from '../riot/client.js';
import { isStale, TTL } from '../lib/staleness.js';

// Business logic and database access for League (ranked) entries.
// Orchestrates: Riot ID → Account v1 (puuid) → League v4 entries/by-puuid.
// All entries are upserted to Postgres (idempotent on @@id([puuid, queueType])).
// Throws ApiError for expected failures so controllers stay thin.
export const leagueService = {
  // Resolves a Riot ID + region to ranked entries (solo/duo + flex).
  // Returns { puuid, entries: LeagueEntry[] }. Empty array if unranked.
  async findEntriesByRiotId(
    region: RiotRegion,
    gameName: string,
    tagLine: string,
  ) {
    const riotAccount = await resolveAndCacheAccount(region, gameName, tagLine);

    const cachedEntries = await prisma.leagueEntry.findMany({
      where: { puuid: riotAccount.puuid },
      orderBy: { updatedAt: 'desc' },
    });
    if (cachedEntries[0] && !isStale(cachedEntries[0].updatedAt, TTL.league)) {
      return { puuid: riotAccount.puuid, entries: cachedEntries };
    }

    const riotEntries: RiotLeagueEntry[] = await getEntriesByPuuid(region, riotAccount.puuid);

    // Upsert each entry (idempotent via @@id([puuid, queueType])).
    for (const e of riotEntries) {
      await prisma.leagueEntry.upsert({
        where: {
          puuid_queueType: { puuid: e.puuid, queueType: e.queueType },
        },
        create: {
          puuid: e.puuid,
          queueType: e.queueType,
          tier: e.tier,
          rank: e.rank,
          leaguePoints: e.leaguePoints,
          wins: e.wins,
          losses: e.losses,
          veteran: e.veteran,
          inactive: e.inactive,
          freshBlood: e.freshBlood,
          hotStreak: e.hotStreak,
        },
        update: {
          tier: e.tier,
          rank: e.rank,
          leaguePoints: e.leaguePoints,
          wins: e.wins,
          losses: e.losses,
          veteran: e.veteran,
          inactive: e.inactive,
          freshBlood: e.freshBlood,
          hotStreak: e.hotStreak,
        },
      });
    }

    if (riotEntries.length === 0) {
      await prisma.leagueEntry.deleteMany({ where: { puuid: riotAccount.puuid } });
    } else {
      await prisma.leagueEntry.deleteMany({
        where: {
          puuid: riotAccount.puuid,
          queueType: { notIn: riotEntries.map((entry) => entry.queueType) },
        },
      });
    }

    const entries = await prisma.leagueEntry.findMany({
      where: { puuid: riotAccount.puuid },
      orderBy: { queueType: 'asc' },
    });
    return { puuid: riotAccount.puuid, entries };
  },
};
