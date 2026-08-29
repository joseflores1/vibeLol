import type { MatchTab } from "../components/Tabs";

// Maps a Tabs selection (UI-facing: All / Ranked Solo / Ranked Flex / Normal)
// to the Match v5 list query params Riot accepts. Values mirror the
// backend's matchListQuerySchema (queue ID for ranked, `type` for normal).
//
// Queue IDs (Riot's constants):
//   420 = RANKED_SOLO_5x5
//   440 = RANKED_FLEX_SR
//   450 = ARAM (excluded here — not in the Tabs)
//
// `type=normal` covers blind + draft normal Summoner's Rift games.
export const TAB_TO_QUERY: Record<MatchTab, { queue?: number; type?: string }> = {
  all: {},
  solo: { queue: 420 },
  flex: { queue: 440 },
  normal: { type: "normal" },
};

// ── Analytics queue tabs ──
// Maps an AnalyticsTabs selection to the analytics query's queue id.
// `undefined` = all analytics-eligible queues (the backend default).
export type AnalyticsQueueTab = "all" | "solo" | "flex" | "draft";

export const ANALYTICS_TAB_TO_QUEUE: Record<AnalyticsQueueTab, number | undefined> = {
  all: undefined,
  solo: 420,
  flex: 440,
  draft: 400,
};

export const TAB_TO_LABELS: Record<AnalyticsQueueTab, string> = {
  all: "All",
  solo: "Ranked Solo",
  flex: "Ranked Flex",
  draft: "Normal Draft",
};

export function queueForTab(tab: AnalyticsQueueTab): number | undefined {
  return ANALYTICS_TAB_TO_QUEUE[tab];
}