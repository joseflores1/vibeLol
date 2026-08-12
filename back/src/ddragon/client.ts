import { z } from 'zod';

// ── Data Dragon is a public CDN with static game data (no API key, no rate
// limits). The entire dataset is ~200KB, so we cache it in-memory as a
// singleton. The version bumps every 2 weeks; we check for version changes
// hourly and refetch when needed. This is the standard pattern for Data
// Dragon (op.gg / lolalytics do the same).

const DDRAGON_BASE = 'https://ddragon.leagueoflegends.com';

// ── Zod schemas for the Data Dragon response shapes ──

const versionsSchema = z.array(z.string());

const championDataSchema = z.object({
  id: z.string(),
  key: z.string(),
  name: z.string(),
  title: z.string(),
  tags: z.array(z.string()),
});
const championResponseSchema = z.object({
  data: z.record(z.string(), championDataSchema),
});

const itemGoldSchema = z.object({
  total: z.number(),
  base: z.number().optional(),
  sell: z.number().optional(),
  purchasable: z.boolean().optional(),
});
const itemDataSchema = z.object({
  name: z.string(),
  gold: itemGoldSchema,
});
const itemResponseSchema = z.object({
  data: z.record(z.string(), itemDataSchema),
});

const spellDataSchema = z.object({
  key: z.string(),
  name: z.string(),
  id: z.string(),
});
const spellResponseSchema = z.object({
  data: z.record(z.string(), spellDataSchema),
});

// ── Public types ──

// Inferred types from the zod schemas (used internally for Object.entries
// narrowing — TS7 + noUncheckedIndexedAccess makes z.record entries 'unknown'
// in Object.entries, so we cast through these types).
type ChampionDataParsed = z.infer<typeof championDataSchema>;
type ItemDataParsed = z.infer<typeof itemDataSchema>;
type SpellDataParsed = z.infer<typeof spellDataSchema>;

export interface Champion {
  key: number;
  // Alphabetic ID used for Data Dragon icon URLs (e.g., "Aatrox", "MonkeyKing").
  // Distinct from `name` ("Wukong") — many champions share ID≠name.
  id: string;
  name: string;
  title: string;
  tags: string[];
}
export interface Item {
  id: number;
  name: string;
  gold: number;
}
export interface Spell {
  key: number;
  name: string;
  id: string;
}
export type ChampionMap = Map<number, Champion>;
export type ItemMap = Map<number, Item>;
export type SpellMap = Map<number, Spell>;

// ── Singleton client ──

class DdragonClient {
  private version = '';
  private champions: ChampionMap = new Map();
  private items: ItemMap = new Map();
  private spells: SpellMap = new Map();
  private lastVersionCheck = 0;
  private readonly versionCheckIntervalMs = 60 * 60 * 1000; // 1 hour
  private initialized = false;

  // Eagerly fetch all Data Dragon data on startup. Called before
  // app.listen() in server.ts.
  async init(): Promise<void> {
    await this.refresh();
    this.initialized = true;
  }

  // Checks if the latest Data Dragon version has changed; if so, refetches
  // all data. Called on a setInterval from server.ts (hourly).
  async refreshIfNeeded(): Promise<void> {
    const now = Date.now();
    if (now - this.lastVersionCheck < this.versionCheckIntervalMs) return;
    await this.refresh();
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getVersion(): string {
    return this.version;
  }

  getChampions(): ChampionMap {
    return this.champions;
  }

  getItems(): ItemMap {
    return this.items;
  }

  getSpells(): SpellMap {
    return this.spells;
  }

  // ── Icon URL constructors (pure, given the cached version) ──

  championIconUrl(name: string): string {
    return `${DDRAGON_BASE}/cdn/${this.version}/img/champion/${name}.png`;
  }
  itemIconUrl(itemId: number): string {
    return `${DDRAGON_BASE}/cdn/${this.version}/img/item/${itemId}.png`;
  }
  spellIconUrl(spellKey: string): string {
    return `${DDRAGON_BASE}/cdn/${this.version}/img/spell/${spellKey}.png`;
  }
  profileIconUrl(iconId: number): string {
    return `${DDRAGON_BASE}/cdn/${this.version}/img/profileicon/${iconId}.png`;
  }

  // ── Internal: fetch + parse all data for a version ──

  private async refresh(): Promise<void> {
    // 1. Fetch the latest version.
    const versionsRes = await fetch(`${DDRAGON_BASE}/api/versions.json`);
    const versions = versionsSchema.parse(await versionsRes.json());
    const latestVersion = versions[0]!;
    if (!latestVersion) throw new Error('Data Dragon versions.json returned an empty array');

    // Skip refetch if the version hasn't changed.
    if (latestVersion === this.version) {
      this.lastVersionCheck = Date.now();
      return;
    }

    this.version = latestVersion;
    const base = `${DDRAGON_BASE}/cdn/${this.version}/data/en_US`;

    // 2. Fetch champions, items, spells in parallel.
    const [champRes, itemRes, spellRes] = await Promise.all([
      fetch(`${base}/champion.json`),
      fetch(`${base}/item.json`),
      fetch(`${base}/summoner.json`),
    ]);

    const champJson = championResponseSchema.parse(await champRes.json());
    const itemJson = itemResponseSchema.parse(await itemRes.json());
    const spellJson = spellResponseSchema.parse(await spellRes.json());

    // 3. Build keyed maps.

    this.champions = new Map(
      Object.entries(champJson.data as Record<string, ChampionDataParsed>).map(([, champ]) => [
        Number(champ.key),
        {
          key: Number(champ.key),
          id: champ.id,
          name: champ.name,
          title: champ.title,
          tags: champ.tags,
        } satisfies Champion,
      ]),
    );

    this.items = new Map(
      Object.entries(itemJson.data as Record<string, ItemDataParsed>).map(([id, item]) => [
        Number(id),
        {
          id: Number(id),
          name: item.name,
          gold: item.gold.total,
        } satisfies Item,
      ]),
    );

    this.spells = new Map(
      Object.entries(spellJson.data as Record<string, SpellDataParsed>).map(([, spell]) => [
        Number(spell.key),
        {
          key: Number(spell.key),
          name: spell.name,
          id: spell.id,
        } satisfies Spell,
      ]),
    );

    this.lastVersionCheck = Date.now();
  }
}

// Exported singleton — always use this, never instantiate DdragonClient
// directly. The server.ts entrypoint calls init() on startup.
export const ddragonClient = new DdragonClient();