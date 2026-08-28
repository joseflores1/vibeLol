import type { RiotRegion } from "../hooks/useApi";

export type { RiotRegion };

export interface RegionInfo {
  code: RiotRegion;
  name: string;
}

const REGION_VALUES: RiotRegion[] = [
  "na1", "br1", "la1", "la2", "oc1",
  "euw1", "eun1", "tr1", "ru",
  "kr", "jp1",
  "ph2", "sg2", "th2", "tw2", "vn2",
];

// Per AGENTS.md §12: show both the platform code and a display name.
// Riot's platform codes (na1, la1, la2) aren't user-friendly on their own.
export const REGIONS: RegionInfo[] = [
  { code: "na1",  name: "North America" },
  { code: "br1",  name: "Brazil" },
  { code: "la1",  name: "Latin America North" },
  { code: "la2",  name: "Latin America South" },
  { code: "oc1",  name: "Oceania" },
  { code: "euw1", name: "Europe West" },
  { code: "eun1", name: "Europe Nordic & East" },
  { code: "tr1",  name: "Türkiye" },
  { code: "ru",   name: "Russia" },
  { code: "kr",   name: "Korea" },
  { code: "jp1",  name: "Japan" },
  { code: "ph2",  name: "Philippines" },
  { code: "sg2",  name: "Singapore" },
  { code: "th2",  name: "Thailand" },
  { code: "tw2",  name: "Taiwan" },
  { code: "vn2",  name: "Vietnam" },
];

// Lookup: code → display name. Used by RegionPill.
const regionNameMap = new Map<RiotRegion, string>(
  REGIONS.map((r) => [r.code, r.name]),
);

export function regionDisplayName(code: RiotRegion): string {
  return regionNameMap.get(code) ?? code.toUpperCase();
}

// Validates a ?region= query param, falling back to na1 (the same default
// the backend validators apply). Shared by every page that reads the region
// from the URL.
export function assertRegion(s: string | null): RiotRegion {
  return (REGION_VALUES as readonly string[]).includes(s ?? "") ? (s as RiotRegion) : "na1";
}