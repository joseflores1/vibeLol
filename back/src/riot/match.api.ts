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

// --- Match detail zod schema (essential fields only) ---

const participantSchema = z.object({
  puuid: z.string(),
  championId: z.number(),
  championName: z.string(),
  kills: z.number(),
  deaths: z.number(),
  assists: z.number(),
  goldEarned: z.number(),
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