// Data Dragon icon URL helpers. The frontend loads images directly from
// the Data Dragon CDN (AGENTS.md §7 allows this for static assets —
// they're public images, not API calls). The version comes from our
// backend's /static/version endpoint.

const DDRAGON_BASE = "https://ddragon.leagueoflegends.com";

export function profileIconUrl(version: string, iconId: number): string {
  return `${DDRAGON_BASE}/cdn/${version}/img/profileicon/${iconId}.png`;
}

export function championIconUrl(version: string, championId: string): string {
  // championId here is the alphabetic ID (e.g., "Aatrox"), not the numeric
  // key. Use our /static/champions endpoint to look up key→ID mappings.
  return `${DDRAGON_BASE}/cdn/${version}/img/champion/${championId}.png`;
}

export function itemIconUrl(version: string, itemId: number): string {
  return `${DDRAGON_BASE}/cdn/${version}/img/item/${itemId}.png`;
}

export function spellIconUrl(version: string, spellKey: string): string {
  return `${DDRAGON_BASE}/cdn/${version}/img/spell/${spellKey}.png`;
}