import { z } from 'zod';
import { riotGet, type RiotCluster } from './client.js';

// --- Match list query options (the /by-puuid/{puuid}/ids query params) ---

export interface MatchListOptions {
  start?: number;
  count?: number;
  startTime?: number;
  endTime?: number;
  queue?: number;
  type?: 'ranked' | 'normal' | 'tourney' | 'tournament';
}

const perkSelectionSchema = z.object({
  perk: z.number(),
  var1: z.number(),
  var2: z.number(),
  var3: z.number(),
});

const perkStyleSchema = z.object({
  description: z.string(),
  style: z.number(),
  selections: z.array(perkSelectionSchema),
});

const perksSchema = z.object({
  styles: z.array(perkStyleSchema),
  statPerks: z.object({
    defense: z.number(),
    flex: z.number(),
    offense: z.number(),
  }),
});

// --- Match detail zod schema ---

const participantSchema = z.object({
  puuid: z.string(),
  championId: z.number(),
  championName: z.string(),
  riotIdGameName: z.string().nullable().optional(),
  riotIdTagline: z.string().nullable().optional(),
  profileIcon: z.number().nullable().optional(),
  individualPosition: z.string().nullable().optional(),
  teamPosition: z.string().nullable().optional(),
  kills: z.number(),
  deaths: z.number(),
  assists: z.number(),
  goldEarned: z.number(),
  goldSpent: z.number().nullable().optional(),
  item0: z.number().nullable().optional(),
  item1: z.number().nullable().optional(),
  item2: z.number().nullable().optional(),
  item3: z.number().nullable().optional(),
  item4: z.number().nullable().optional(),
  item5: z.number().nullable().optional(),
  item6: z.number().nullable().optional(),
  summoner1Id: z.number(),
  summoner2Id: z.number(),
  teamId: z.number(),
  win: z.boolean(),
  visionScore: z.number().nullable().optional(),
  wardsPlaced: z.number().nullable().optional(),
  wardsKilled: z.number().nullable().optional(),
  totalMinionsKilled: z.number().nullable().optional(),
  neutralMinionsKilled: z.number().nullable().optional(),
  champLevel: z.number().nullable().optional(),
  totalDamageDealtToChampions: z.number().nullable().optional(),
  totalDamageTaken: z.number().nullable().optional(),
  damageDealtToObjectives: z.number().nullable().optional(),
  damageSelfMitigated: z.number().nullable().optional(),
  totalHeal: z.number().nullable().optional(),
  totalTimeCCingOthers: z.number().nullable().optional(),
  doubleKills: z.number().nullable().optional(),
  tripleKills: z.number().nullable().optional(),
  quadraKills: z.number().nullable().optional(),
  pentaKills: z.number().nullable().optional(),
  largestKillingSpree: z.number().nullable().optional(),
  largestMultiKill: z.number().nullable().optional(),
  towerKills: z.number().nullable().optional(),
  inhibitorKills: z.number().nullable().optional(),
  baronKills: z.number().nullable().optional(),
  dragonKills: z.number().nullable().optional(),
  firstBloodKill: z.boolean().nullable().optional(),
  perks: perksSchema.nullable().optional(),
});

const teamBanSchema = z.object({
  championId: z.number(),
  pickTurn: z.number().nullable().optional(),
});

const teamSchema = z.object({
  teamId: z.number(),
  // Older data versions encode "Win"/"Fail" strings; participant rows are
  // the win source of truth, so this is parsed defensively and unused.
  win: z.union([z.boolean(), z.string()]).nullable().optional(),
  bans: z.array(teamBanSchema).nullable().optional(),
});

const matchInfoSchema = z.object({
  gameCreation: z.number(),
  gameDuration: z.number(),
  gameStartTimestamp: z.number(),
  gameEndTimestamp: z.number().nullable().optional(),
  gameMode: z.string(),
  gameType: z.string(),
  gameVersion: z.string().nullable().optional(),
  mapId: z.number().nullable().optional(),
  queueId: z.number().nullable().optional(),
  teams: z.array(teamSchema).nullable().optional(),
  participants: z.array(participantSchema),
});

const matchMetadataSchema = z.object({
  dataVersion: z.string().nullable().optional(),
  matchId: z.string(),
  participants: z.array(z.string()),
});

export const matchSchema = z.object({
  metadata: matchMetadataSchema,
  info: matchInfoSchema,
});

export type RiotMatch = z.infer<typeof matchSchema>;
export type RiotParticipant = z.infer<typeof participantSchema>;
export type RiotPerks = z.infer<typeof perksSchema>;
export type RiotTeam = z.infer<typeof teamSchema>;

// --- API functions ---

// Match v5 is cluster-routed (americas/europe/asia). Lists match IDs for a
// given puuid with optional filters.
// Endpoint: /lol/match/v5/matches/by-puuid/{puuid}/ids
export async function getMatchIdsByPuuid(
  cluster: RiotCluster,
  puuid: string,
  opts: MatchListOptions = {},
): Promise<string[]> {
  const params = new URLSearchParams();
  if (opts.start !== undefined) params.set('start', String(opts.start));
  if (opts.count !== undefined) params.set('count', String(opts.count));
  if (opts.startTime !== undefined) params.set('startTime', String(opts.startTime));
  if (opts.endTime !== undefined) params.set('endTime', String(opts.endTime));
  if (opts.queue !== undefined) params.set('queue', String(opts.queue));
  if (opts.type !== undefined) params.set('type', opts.type);

  const qs = params.toString();
  const path = `/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids${qs ? `?${qs}` : ''}`;
  const data = await riotGet<unknown>(cluster, path);
  return z.array(z.string()).parse(data);
}

// Match v5 detail. Full metadata + info with all 10 participants.
// Endpoint: /lol/match/v5/matches/{matchId}
export async function getMatch(
  cluster: RiotCluster,
  matchId: string,
): Promise<RiotMatch> {
  const path = `/lol/match/v5/matches/${encodeURIComponent(matchId)}`;
  const data = await riotGet<unknown>(cluster, path);
  return matchSchema.parse(data);
}
