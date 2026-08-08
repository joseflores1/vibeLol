import { prisma } from '../lib/client.js';
import { getByRiotId } from '../riot/account.api.js';
import { getMatchIdsByPuuid, getMatch, type MatchListOptions } from '../riot/match.api.js';
import type { RiotRegion, RiotCluster } from '../riot/client.js';
import { clusterFromRegion } from './summoner.service.js';

// Business logic and database access for Match entities.
// Orchestrates: Riot ID → Account v1 (puuid) → Match v5 (list/detail).
// Match detail is cached in Postgres (idempotent upsert keyed on matchId +
// @@unique([matchId, puuid]) for participants). Match ID list is not
// cached (cheap — just a string[] from Riot, no persistence needed).
// Throws ApiError for expected failures so controllers stay thin.
export const matchService = {
  // Resolves a Riot ID + region to a list of match IDs from Riot.
  // Returns { puuid, matchIds }. The puuid is included in the response
  // so the frontend can identify "your row" in participant lists later.
  async findMatchIdsByRiotId(
    region: RiotRegion,
    gameName: string,
    tagLine: string,
    opts: MatchListOptions = {},
  ) {
    const cluster: RiotCluster = clusterFromRegion(region);
    const riotAccount = await getByRiotId(cluster, gameName, tagLine);
    const matchIds = await getMatchIdsByPuuid(cluster, riotAccount.puuid, opts);

    // Persist the Account so future lookups are cached.
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

    return { puuid: riotAccount.puuid, matchIds };
  },

  // Fetches a single match by matchId. Checks the DB cache first; on miss,
  // fetches from Riot and persists the match + all 10 participants.
  // The region query param is only used for routing (the cluster to call
  // Riot on); the matchId itself encodes the region prefix.
  async findMatchById(region: RiotRegion, matchId: string) {
    // 1. Check DB cache first.
    const cached = await prisma.match.findUnique({
      where: { matchId },
      include: { participants: true },
    });
    if (cached) return cached;

    // 2. Cache miss — fetch from Riot (cluster-routed).
    const cluster: RiotCluster = clusterFromRegion(region);
    const riotMatch = await getMatch(cluster, matchId);

    // 3. Persist match + participants in a transaction.
    const match = await prisma.match.upsert({
      where: { matchId: riotMatch.metadata.matchId },
      create: {
        matchId: riotMatch.metadata.matchId,
        dataVersion: riotMatch.metadata.dataVersion,
        gameCreation: new Date(riotMatch.info.gameCreation),
        gameDuration: riotMatch.info.gameDuration,
        gameStartTimestamp: new Date(riotMatch.info.gameStartTimestamp),
        gameEndTimestamp: riotMatch.info.gameEndTimestamp
          ? new Date(riotMatch.info.gameEndTimestamp)
          : null,
        gameMode: riotMatch.info.gameMode,
        gameType: riotMatch.info.gameType,
        gameVersion: riotMatch.info.gameVersion,
        mapId: riotMatch.info.mapId,
        queueId: riotMatch.info.queueId,
      },
      update: {},
      include: { participants: true },
    });

    // Upsert each participant (idempotent via @@unique([matchId, puuid])).
    for (const p of riotMatch.info.participants) {
      await prisma.matchParticipant.upsert({
        where: {
          matchId_puuid: { matchId: match.matchId, puuid: p.puuid },
        },
        create: {
          matchId: match.matchId,
          puuid: p.puuid,
          championId: p.championId,
          championName: p.championName,
          kills: p.kills,
          deaths: p.deaths,
          assists: p.assists,
          goldEarned: p.goldEarned,
          item0: p.item0,
          item1: p.item1,
          item2: p.item2,
          item3: p.item3,
          item4: p.item4,
          item5: p.item5,
          item6: p.item6,
          summoner1Id: p.summoner1Id,
          summoner2Id: p.summoner2Id,
          teamId: p.teamId,
          win: p.win,
          visionScore: p.visionScore,
          wardsPlaced: p.wardsPlaced,
          wardsKilled: p.wardsKilled,
          totalMinionsKilled: p.totalMinionsKilled,
        },
        update: {
          championId: p.championId,
          championName: p.championName,
          kills: p.kills,
          deaths: p.deaths,
          assists: p.assists,
          goldEarned: p.goldEarned,
          item0: p.item0,
          item1: p.item1,
          item2: p.item2,
          item3: p.item3,
          item4: p.item4,
          item5: p.item5,
          item6: p.item6,
          summoner1Id: p.summoner1Id,
          summoner2Id: p.summoner2Id,
          teamId: p.teamId,
          win: p.win,
          visionScore: p.visionScore,
          wardsPlaced: p.wardsPlaced,
          wardsKilled: p.wardsKilled,
          totalMinionsKilled: p.totalMinionsKilled,
        },
      });
    }

    // Re-fetch with participants included (the upsert above returns the
    // match row but participants were added in a separate loop).
    return prisma.match.findUnique({
      where: { matchId },
      include: { participants: true },
    });
  },
};