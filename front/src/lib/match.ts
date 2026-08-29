import type { MatchPerks } from "../types/api";

// Extracts the keystone rune ID from a participant's perk data. Riot puts
// the keystone as the first selection of the primary style tree.
export function keystonePerkId(perks: MatchPerks | null): number | null {
  if (!perks) return null;
  const primary =
    perks.styles.find((s) => s.description === "primaryStyle") ?? perks.styles[0];
  return primary?.selections[0]?.perk ?? null;
}

// Extracts the first secondary-tree rune (a minor rune) for display next
// to the keystone. Falls back to the second style entry when the subStyle
// label is missing.
export function secondaryPerkId(perks: MatchPerks | null): number | null {
  if (!perks) return null;
  const secondary =
    perks.styles.find((s) => s.description === "subStyle") ?? perks.styles[1];
  return secondary?.selections[0]?.perk ?? null;
}

// Canonical lane order for participant rows (top → jungle → mid → bot →
// support). ARAM / arena rows carry "NONE" (or null) and sort last.
const POSITION_ORDER = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"] as const;

export function positionRank(position: string | null | undefined): number {
  const idx = POSITION_ORDER.indexOf(position as (typeof POSITION_ORDER)[number]);
  return idx === -1 ? POSITION_ORDER.length : idx;
}
