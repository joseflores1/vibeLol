import { prisma } from '../lib/client.js';
import { Prisma } from '../generated/prisma/client.js';
import {
  getMatchIdsByPuuid,
  getMatch,
  getTimeline,
  type MatchListOptions,
  type RiotParticipant,
  type RiotTimeline,
} from '../riot/match.api.js';
import type { RiotRegion, RiotCluster } from '../riot/client.js';
import { clusterFromRegion } from '../constants/regions.js';
import { resolveAndCacheAccount } from './summoner.service.js';
import { isStale, TTL } from '../lib/staleness.js';

interface MatchListCacheEntry {
  fetchedAt: Date;
  result: { puuid: string; matchIds: string[] };
}

export interface MatchTeamAggregate {
  teamId: number;
  win: boolean;
  totalGoldEarned: number;
  totalKills: number;
  totalDeaths: number;
  totalAssists: number;
  totalVisionScore: number;
  totalWardsPlaced: number;
  totalWardsKilled: number;
  totalMinionsKilled: number;
  totalDamageDealtToChampions: number;
  totalDamageTaken: number;
  damageDealtToObjectives: number;
  towerKills: number;
  inhibitorKills: number;
  baronKills: number;
  dragonKills: number;
}

type ParticipantForAggregate = {
  teamId: number;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  goldEarned: number;
  visionScore: number | null;
  wardsPlaced: number | null;
  wardsKilled: number | null;
  totalMinionsKilled: number | null;
  totalDamageDealtToChampions: number | null;
  totalDamageTaken: number | null;
  damageDealtToObjectives: number | null;
  towerKills: number | null;
  inhibitorKills: number | null;
  baronKills: number | null;
  dragonKills: number | null;
};

function add(value: number | null): number {
  return value ?? 0;
}

function aggregateTeams(participants: ParticipantForAggregate[]): MatchTeamAggregate[] {
  const teams = new Map<number, MatchTeamAggregate>();
  for (const participant of participants) {
    const current = teams.get(participant.teamId) ?? {
      teamId: participant.teamId,
      win: participant.win,
      totalGoldEarned: 0,
      totalKills: 0,
      totalDeaths: 0,
      totalAssists: 0,
      totalVisionScore: 0,
      totalWardsPlaced: 0,
      totalWardsKilled: 0,
      totalMinionsKilled: 0,
      totalDamageDealtToChampions: 0,
      totalDamageTaken: 0,
      damageDealtToObjectives: 0,
      towerKills: 0,
      inhibitorKills: 0,
      baronKills: 0,
      dragonKills: 0,
    };

    current.totalGoldEarned += participant.goldEarned;
    current.totalKills += participant.kills;
    current.totalDeaths += participant.deaths;
    current.totalAssists += participant.assists;
    current.totalVisionScore += add(participant.visionScore);
    current.totalWardsPlaced += add(participant.wardsPlaced);
    current.totalWardsKilled += add(participant.wardsKilled);
    current.totalMinionsKilled += add(participant.totalMinionsKilled);
    current.totalDamageDealtToChampions += add(participant.totalDamageDealtToChampions);
    current.totalDamageTaken += add(participant.totalDamageTaken);
    current.damageDealtToObjectives += add(participant.damageDealtToObjectives);
    current.towerKills += add(participant.towerKills);
    current.inhibitorKills += add(participant.inhibitorKills);
    current.baronKills += add(participant.baronKills);
    current.dragonKills += add(participant.dragonKills);
    teams.set(participant.teamId, current);
  }
  return Array.from(teams.values()).sort((a, b) => a.teamId - b.teamId);
}

function withTeamAggregates<T extends { participants: ParticipantForAggregate[] }>(match: T) {
  return { ...match, teams: aggregateTeams(match.participants) };
}

function participantData(p: RiotParticipant) {
  return {
    puuid: p.puuid,
    championId: p.championId,
    championName: p.championName,
    riotIdGameName: p.riotIdGameName ?? null,
    riotIdTagline: p.riotIdTagline ?? null,
    profileIcon: p.profileIcon ?? null,
    individualPosition: p.individualPosition ?? null,
    teamPosition: p.teamPosition ?? null,
    kills: p.kills,
    deaths: p.deaths,
    assists: p.assists,
    goldEarned: p.goldEarned,
    goldSpent: p.goldSpent ?? null,
    item0: p.item0 ?? null,
    item1: p.item1 ?? null,
    item2: p.item2 ?? null,
    item3: p.item3 ?? null,
    item4: p.item4 ?? null,
    item5: p.item5 ?? null,
    item6: p.item6 ?? null,
    summoner1Id: p.summoner1Id,
    summoner2Id: p.summoner2Id,
    teamId: p.teamId,
    win: p.win,
    visionScore: p.visionScore ?? null,
    wardsPlaced: p.wardsPlaced ?? null,
    wardsKilled: p.wardsKilled ?? null,
    totalMinionsKilled: p.totalMinionsKilled ?? null,
    neutralMinionsKilled: p.neutralMinionsKilled ?? null,
    champLevel: p.champLevel ?? null,
    totalDamageDealtToChampions: p.totalDamageDealtToChampions ?? null,
    totalDamageTaken: p.totalDamageTaken ?? null,
    damageDealtToObjectives: p.damageDealtToObjectives ?? null,
    damageSelfMitigated: p.damageSelfMitigated ?? null,
    totalHeal: p.totalHeal ?? null,
    totalTimeCCingOthers: p.totalTimeCCingOthers ?? null,
    doubleKills: p.doubleKills ?? null,
    tripleKills: p.tripleKills ?? null,
    quadraKills: p.quadraKills ?? null,
    pentaKills: p.pentaKills ?? null,
    largestKillingSpree: p.largestKillingSpree ?? null,
    largestMultiKill: p.largestMultiKill ?? null,
    towerKills: p.towerKills ?? null,
    inhibitorKills: p.inhibitorKills ?? null,
    baronKills: p.baronKills ?? null,
    dragonKills: p.dragonKills ?? null,
    firstBloodKill: p.firstBloodKill ?? null,
    perks: p.perks ?? Prisma.DbNull,
  };
}

const matchListCache = new Map<string, MatchListCacheEntry>();
const MAX_MATCH_LIST_CACHE_ENTRIES = 1000;

function matchListCacheKey(
  region: RiotRegion,
  gameName: string,
  tagLine: string,
  opts: MatchListOptions,
) {
  return JSON.stringify([region, gameName, tagLine, opts]);
}

// Business logic and database access for Match entities.
// Orchestrates: Riot ID → Account v1 (puuid) → Match v5 (list/detail).
// Match detail is cached in Postgres (idempotent upsert keyed on matchId +
// @@unique([matchId, puuid]) for participants). Match ID lists use a bounded
// process-local TTL cache because the list has no persistence model.
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
    // Champion-filtered history: Riot's list endpoint has no champion
    // filter, so this path serves exclusively from the cached
    // match_participants table (indexed on puuid + championId). Depth is
    // bounded by what the cache holds — documented trade-off.
    if (opts.champion != null) {
      const riotAccount = await resolveAndCacheAccount(region, gameName, tagLine);
      const rows = await prisma.matchParticipant.findMany({
        where: {
          puuid: riotAccount.puuid,
          championId: opts.champion,
          match: {
            isCustom: false,
            ...(opts.queue ? { queueId: opts.queue } : {}),
          },
        },
        orderBy: { match: { gameCreation: 'desc' } },
        take: opts.count ?? 20,
        select: { matchId: true },
      });
      return { puuid: riotAccount.puuid, matchIds: rows.map((row) => row.matchId) };
    }

    const key = matchListCacheKey(region, gameName, tagLine, opts);
    const cached = matchListCache.get(key);
    if (cached && !isStale(cached.fetchedAt, TTL.matchList)) return cached.result;

    const cluster: RiotCluster = clusterFromRegion(region);
    const riotAccount = await resolveAndCacheAccount(region, gameName, tagLine);
    const matchIds = await getMatchIdsByPuuid(cluster, riotAccount.puuid, opts);

    // Server-side custom-game guarantee (Riot ToS: custom-queue history
    // requires RSO opt-in to display). Riot's list endpoint returns bare
    // IDs with no queue info, so customs can only be identified once their
    // detail is cached — this pass drops every already-cached custom, and
    // the guarantee strengthens as the cache warms.
    const cachedCustoms = await prisma.match.findMany({
      where: { matchId: { in: matchIds }, isCustom: true },
      select: { matchId: true },
    });
    const customIds = new Set(cachedCustoms.map((m) => m.matchId));
    const visibleIds = customIds.size > 0
      ? matchIds.filter((id) => !customIds.has(id))
      : matchIds;

    const result = { puuid: riotAccount.puuid, matchIds: visibleIds };
    matchListCache.delete(key);
    matchListCache.set(key, { fetchedAt: new Date(), result });
    if (matchListCache.size > MAX_MATCH_LIST_CACHE_ENTRIES) {
      const oldest = matchListCache.keys().next().value;
      if (oldest) matchListCache.delete(oldest);
    }
    return result;
  },

  // Fetches a single match by matchId. Checks the DB cache first; on miss,
  // fetches from Riot and persists the match + all 10 participants.
  // The region query param is only used for routing (the cluster to call
  // Riot on); the matchId itself encodes the region prefix.
  async findMatchById(region: RiotRegion, matchId: string) {
    const cached = await prisma.match.findUnique({
      where: { matchId },
      include: { participants: true },
    });
    // bansFetchedAt gates one-time enrichment of matches cached before
    // ban persistence (Phase 8b); legitimately ban-free games set it on
    // their first Riot fetch, so there is no refetch loop.
    const needsEnrichment = !cached
      || cached.participants.length === 0
      || cached.participants.some((participant) => participant.perks == null)
      || cached.bansFetchedAt == null;
    if (cached && !needsEnrichment) return withTeamAggregates(cached);

    const cluster: RiotCluster = clusterFromRegion(region);
    const riotMatch = await getMatch(cluster, matchId);

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
        isCustom: riotMatch.info.gameType === 'CUSTOM_GAME',
      },
      update: {
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
        isCustom: riotMatch.info.gameType === 'CUSTOM_GAME',
      },
      include: { participants: true },
    });

    for (const p of riotMatch.info.participants) {
      await prisma.matchParticipant.upsert({
        where: {
          matchId_puuid: { matchId: match.matchId, puuid: p.puuid },
        },
        create: { matchId: match.matchId, ...participantData(p) },
        update: participantData(p),
      });
    }

    // Team bans: idempotent rewrite (delete + create) on every Riot fetch.
    const bans = (riotMatch.info.teams ?? []).flatMap((team) =>
      (team.bans ?? []).map((ban, banIndex) => ({
        matchId: match.matchId,
        teamId: team.teamId,
        championId: ban.championId,
        // Riot occasionally omits pickTurn; fall back to ban order (1-5).
        pickTurn: ban.pickTurn ?? banIndex + 1,
      })),
    );
    await prisma.matchBan.deleteMany({ where: { matchId: match.matchId } });
    if (bans.length > 0) await prisma.matchBan.createMany({ data: bans });
    await prisma.match.update({
      where: { matchId: match.matchId },
      data: { bansFetchedAt: new Date() },
    });

    const enriched = await prisma.match.findUnique({
      where: { matchId },
      include: { participants: true },
    });
    return enriched ? withTeamAggregates(enriched) : null;
  },

  // Timeline for one match. The raw Riot JSON is persisted fetch-through
  // on the Match row (a finished match's timeline never changes, so it
  // caches indefinitely); the served payload is slimmed to the puuid order
  // plus per-minute participantFrames — the bulky events array stays in
  // the DB for future kill-timeline features.
  async findTimeline(region: RiotRegion, matchId: string) {
    const cached = await prisma.match.findUnique({
      where: { matchId },
      select: { timeline: true },
    });
    if (cached?.timeline != null) return slimTimeline(matchId, cached.timeline);

    // Ensure the match row exists before attaching a timeline — this also
    // warms participants for the page that renders the graph. Propagates
    // Riot 404s as ApiError.notFound when the matchId is bogus.
    await this.findMatchById(region, matchId);

    const riotTimeline = await getTimeline(clusterFromRegion(region), matchId);
    await prisma.match.update({
      where: { matchId },
      data: { timeline: riotTimeline as unknown as Prisma.InputJsonValue },
    });
    return slimTimeline(matchId, riotTimeline);
  },
};

// Strips events and normalizes the stored Riot timeline JSON into the
// public response shape.
function slimTimeline(matchId: string, raw: unknown) {
  const t = raw as {
    metadata?: { participants?: string[] };
    info?: { frames?: Array<{ timestamp?: number; participantFrames?: unknown }> };
  };
  return {
    matchId,
    puuids: t.metadata?.participants ?? [],
    frames: (t.info?.frames ?? []).map((frame) => ({
      timestamp: frame.timestamp ?? 0,
      participantFrames: frame.participantFrames ?? {},
    })),
  };
}
