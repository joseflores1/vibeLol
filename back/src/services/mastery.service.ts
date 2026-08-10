import { prisma } from '../lib/client.js';
import { getByPuuid, getByChampion, type RiotMasteryEntry } from '../riot/mastery.api.js';
import { resolveAndCacheAccount } from './summoner.service.js';
import type { RiotRegion } from '../riot/client.js';

// Business logic and database access for Champion Mastery.
// Orchestrates: Riot ID → Account v1 (puuid) → Champion Mastery v4.
// Entries are upserted to Postgres (idempotent on @@id([puuid, championId])).
// Throws ApiError for expected failures so controllers stay thin.
export const masteryService = {
  // Resolves a Riot ID + region to the full champion mastery list.
  // Returns { puuid, masteries: ChampionMastery[] }. Empty array if no
  // mastery data (e.g., brand-new account). Frontend sorts/slices locally.
  async findByRiotId(region: RiotRegion, gameName: string, tagLine: string) {
    const riotAccount = await resolveAndCacheAccount(region, gameName, tagLine);
    const riotMasteries: RiotMasteryEntry[] = await getByPuuid(region, riotAccount.puuid);

    for (const m of riotMasteries) {
      await prisma.championMastery.upsert({
        where: {
          puuid_championId: { puuid: m.puuid, championId: m.championId },
        },
        create: {
          puuid: m.puuid,
          championId: m.championId,
          championLevel: m.championLevel,
          championPoints: m.championPoints,
          lastPlayTime: new Date(m.lastPlayTime),
          championPointsSinceLastLevel: m.championPointsSinceLastLevel,
          championPointsUntilNextLevel: m.championPointsUntilNextLevel,
          markRequiredForNextLevel: m.markRequiredForNextLevel,
          tokensEarned: m.tokensEarned,
          championSeasonMilestone: m.championSeasonMilestone,
        },
        update: {
          championLevel: m.championLevel,
          championPoints: m.championPoints,
          lastPlayTime: new Date(m.lastPlayTime),
          championPointsSinceLastLevel: m.championPointsSinceLastLevel,
          championPointsUntilNextLevel: m.championPointsUntilNextLevel,
          markRequiredForNextLevel: m.markRequiredForNextLevel,
          tokensEarned: m.tokensEarned,
          championSeasonMilestone: m.championSeasonMilestone,
        },
      });
    }

    const masteries = await prisma.championMastery.findMany({
      where: { puuid: riotAccount.puuid },
      orderBy: { championPoints: 'desc' },
    });
    return { puuid: riotAccount.puuid, masteries };
  },

  // Resolves a Riot ID + region + championId to a single champion's mastery.
  // 404 from Riot (player has no mastery for that champion) propagates as
  // ApiError.notFound — the frontend surfaces "no mastery data" reasonably.
  async findByChampion(
    region: RiotRegion,
    gameName: string,
    tagLine: string,
    championId: number,
  ) {
    const riotAccount = await resolveAndCacheAccount(region, gameName, tagLine);
    const riotMastery: RiotMasteryEntry = await getByChampion(
      region,
      riotAccount.puuid,
      championId,
    );

    const mastery = await prisma.championMastery.upsert({
      where: {
        puuid_championId: { puuid: riotMastery.puuid, championId: riotMastery.championId },
      },
      create: {
        puuid: riotMastery.puuid,
        championId: riotMastery.championId,
        championLevel: riotMastery.championLevel,
        championPoints: riotMastery.championPoints,
        lastPlayTime: new Date(riotMastery.lastPlayTime),
        championPointsSinceLastLevel: riotMastery.championPointsSinceLastLevel,
        championPointsUntilNextLevel: riotMastery.championPointsUntilNextLevel,
        markRequiredForNextLevel: riotMastery.markRequiredForNextLevel,
        tokensEarned: riotMastery.tokensEarned,
        championSeasonMilestone: riotMastery.championSeasonMilestone,
      },
      update: {
        championLevel: riotMastery.championLevel,
        championPoints: riotMastery.championPoints,
        lastPlayTime: new Date(riotMastery.lastPlayTime),
        championPointsSinceLastLevel: riotMastery.championPointsSinceLastLevel,
        championPointsUntilNextLevel: riotMastery.championPointsUntilNextLevel,
        markRequiredForNextLevel: riotMastery.markRequiredForNextLevel,
        tokensEarned: riotMastery.tokensEarned,
        championSeasonMilestone: riotMastery.championSeasonMilestone,
      },
    });
    return { puuid: riotAccount.puuid, mastery };
  },
};